import { watcher } from "@feng3d/watcher";
import { TemplateInfo, VariableInfo } from "wgsl_reflect";
import { IBindingResources } from "../data/IBindingResources";
import { IGPUBindGroupEntry, IGPUBindingResource, IGPUBufferBinding, IGPUExternalTexture } from "../data/IGPUBindGroup";
import { IGPUComputePipeline } from "../data/IGPUComputeObject";
import { IGPUPipelineLayout } from "../data/IGPUPipelineLayout";
import { IGPURenderPipeline, IGPUSetBindGroup } from "../data/IGPURenderObject";
import { IGPUSampler } from "../data/IGPUSampler";
import { IGPUTextureBase } from "../data/IGPUTexture";
import { IGPUTextureView } from "../data/IGPUTextureView";
import { ChainMap } from "../utils/ChainMap";
import { WGSLBindingResourceInfoMap } from "./getWGSLReflectInfo";

export function getIGPUSetBindGroups(pipeline: IGPURenderPipeline | IGPUComputePipeline, bindingResources: IBindingResources, bindingResourceInfoMap: WGSLBindingResourceInfoMap)
{
    //
    let gpuSetBindGroups = bindGroupsMap.get([pipeline, bindingResources]);
    if (!gpuSetBindGroups)
    {
        gpuSetBindGroups = [];

        const pipelineLayout = pipeline.layout as IGPUPipelineLayout;

        for (const resourceName in bindingResourceInfoMap)
        {
            const bindingResourceInfo = bindingResourceInfoMap[resourceName];

            const { group, binding, type } = bindingResourceInfo;

            gpuSetBindGroups[group] = gpuSetBindGroups[group] || {
                bindGroup: {
                    layout: { ...pipelineLayout.bindGroupLayouts[group] },
                    entries: [],
                }
            };

            const entry: IGPUBindGroupEntry = { binding, resource: null };
            gpuSetBindGroups[group].bindGroup.entries.push(entry);

            // eslint-disable-next-line no-loop-func
            const getResource = () =>
            {
                const bindingResource = bindingResources[resourceName];
                console.assert(!!bindingResource, `在绑定资源中没有找到 ${resourceName} 。`);

                let resource: IGPUBindingResource;
                //
                if (type === "buffer")
                {
                    const variableInfo = bindingResourceInfo.buffer.variableInfo;
                    const layoutType = bindingResourceInfo.buffer.layout.type;

                    //
                    const size = variableInfo.size;

                    const uniformData = bindingResource as IGPUBufferBinding;

                    if (!uniformData.buffer)
                    {
                        uniformData.buffer = {
                            size,
                            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
                        };
                    }

                    const buffer = uniformData.buffer;
                    const offset = uniformData.offset ?? 0; // 默认值为0

                    if (layoutType === "uniform")
                    {
                        resource = {
                            buffer,
                            offset,
                            size,
                        };
                    }
                    else
                    {
                        // 无法确定 storage 中数据的尺寸，不设置 size 属性。
                        resource = {
                            buffer,
                            offset,
                        };
                    }

                    // 更新缓冲区绑定的数据。
                    updateBufferBinding(variableInfo, uniformData);
                }
                else if (type === "sampler")
                {
                    const uniformData = bindingResource as IGPUSampler;

                    resource = uniformData;
                }
                else if (type === "texture")
                {
                    const uniformData = bindingResource as IGPUTextureView;

                    // 设置纹理资源布局上的采样类型。
                    if ((uniformData.texture as IGPUTextureBase).sampleType === "unfilterable-float")
                    {
                        bindingResourceInfo.texture.layout.sampleType = "unfilterable-float";
                    }

                    resource = uniformData;
                }
                else if (type === "externalTexture")
                {
                    const uniformData = bindingResource as IGPUExternalTexture;

                    resource = uniformData;
                }
                else if (type === "storageTexture")
                {
                    const uniformData = bindingResource as IGPUTextureView;

                    resource = uniformData;
                }
                else
                {
                    throw `未解析 ${type}`;
                }

                return resource;
            };

            entry.resource = getResource();

            //
            watcher.watch(bindingResources, resourceName, () =>
            {
                entry.resource = getResource();
            });
        }

        bindGroupsMap.set([pipeline, bindingResources], gpuSetBindGroups);
    }

    return gpuSetBindGroups;
}

const bindGroupsMap = new ChainMap<[IGPURenderPipeline | IGPUComputePipeline, IBindingResources], IGPUSetBindGroup[]>();

function updateBufferBinding(variableInfo: VariableInfo, uniformData: IGPUBufferBinding)
{
    if (!variableInfo.members)
    {
        return;
    }

    if (!uniformData.map)
    {
        return;
    }

    if (uniformData["_variableInfo"] === variableInfo)
    {
        // 已经做好数据映射。
        return;
    }

    if (uniformData["_variableInfo"] !== undefined)
    {
        console.error(`updateBufferBinding 出现一份数据对应多个 variableInfo`);

        return;
    }
    uniformData["_variableInfo"] = variableInfo;

    const buffer = uniformData.buffer;
    const offset = uniformData.offset ?? 0; // 默认值为0

    variableInfo.members.forEach((member) =>
    {
        let update: () => void;
        const subTypeName = (member.type as TemplateInfo).format?.name;
        const subsubTypeName = (member.type as any).format?.format?.name;

        if (member.type.name === "f32" || subTypeName === "f32" || subsubTypeName === "f32")
        {
            update = () =>
            {
                let data: Float32Array;
                const memberData = uniformData.map[member.name];
                if (memberData === undefined)
                {
                    console.warn(`没有找到 binding ${member.name} 值！`);

                    return;
                }
                if (typeof memberData === "number")
                {
                    data = new Float32Array([memberData]);
                }
                else if (memberData.constructor !== Float32Array)
                {
                    data = new Float32Array(memberData);
                }
                else
                {
                    data = memberData;
                }
                const writeBuffers = buffer.writeBuffers ?? [];
                writeBuffers.push({ data: data.buffer, bufferOffset: offset + member.offset, size: member.size });
                buffer.writeBuffers = writeBuffers;
            };
        }
        else if (member.type.name === "i32" || subTypeName === "i32" || subsubTypeName === "i32")
        {
            update = () =>
            {
                let data: Int32Array;
                const memberData = uniformData.map[member.name];
                if (memberData === undefined)
                {
                    console.warn(`没有找到 binding ${member.name} 值！`);

                    return;
                }
                if (typeof memberData === "number")
                {
                    data = new Int32Array([memberData]);
                }
                else if (memberData.constructor !== Int32Array)
                {
                    data = new Int32Array(memberData);
                }
                else
                {
                    data = memberData;
                }
                const writeBuffers = buffer.writeBuffers ?? [];
                writeBuffers.push({ data: data.buffer, bufferOffset: offset + member.offset, size: member.size });
                buffer.writeBuffers = writeBuffers;
            };
        }
        else
        {
            console.error(`未处理缓冲区绑定类型为 ${member.type.name} 的成员！`);
        }
        if (update && uniformData.map)
        {
            update();

            watcher.watch(uniformData.map, member.name, update);
        }
    });
}
