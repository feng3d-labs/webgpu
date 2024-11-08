import { watcher } from "@feng3d/watcher";
import { TemplateInfo, VariableInfo } from "wgsl_reflect";
import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getIGPUComputePipeline } from "../caches/getIGPUComputePipeline";
import { WGSLBindingResourceInfoMap } from "../caches/getWGSLReflectInfo";
import { IGPUBindGroupEntry, IGPUBindingResource, IGPUBufferBinding, IGPUExternalTexture } from "../data/IGPUBindGroupDescriptor";
import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPUComputePipeline } from "../data/IGPUComputeObject";
import { IGPUSetBindGroup } from "../data/IGPURenderObject";
import { IGPUSampler } from "../data/IGPUSampler";
import { IGPUTextureBase } from "../data/IGPUTexture";
import { IGPUTextureView } from "../data/IGPUTextureView";
import { IGPUPipelineLayoutDescriptor } from "../internal/IGPUPipelineLayoutDescriptor";
import { ChainMap } from "../utils/ChainMap";

/**
 * 执行计算绑定组。
 * 
 * @param device GPU设备。
 * @param passEncoder 计算通道编码器。
 * @param pipeline 计算管线。
 * @param bindingResources 绑定资源。
 */
export function runComputeBindGroup(device: GPUDevice, passEncoder: GPUComputePassEncoder, pipeline: IGPUComputePipeline, bindingResources?: IGPUBindingResources)
{
    const { gpuComputePipeline, bindingResourceInfoMap } = getIGPUComputePipeline(pipeline);

    runBindGroup(device, passEncoder, gpuComputePipeline.layout, bindingResources, bindingResourceInfoMap);
}

export function runBindGroup(device: GPUDevice, passEncoder: GPUBindingCommandsMixin, layout: IGPUPipelineLayoutDescriptor, bindingResources: IGPUBindingResources, bindingResourceInfoMap: WGSLBindingResourceInfoMap)
{
    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(layout, bindingResources, bindingResourceInfoMap);

    bindGroups?.forEach((bindGroup, index) =>
    {
        const gpuBindGroup = getGPUBindGroup(device, bindGroup.bindGroup);
        passEncoder.setBindGroup(index, gpuBindGroup, bindGroup.dynamicOffsets);
    });
}

function getIGPUSetBindGroups(layout: IGPUPipelineLayoutDescriptor, bindingResources: IGPUBindingResources, bindingResourceInfoMap: WGSLBindingResourceInfoMap)
{
    //
    let gpuSetBindGroups = bindGroupsMap.get([layout, bindingResources]);
    if (!gpuSetBindGroups)
    {
        gpuSetBindGroups = [];

        const pipelineLayout = layout as GPUPipelineLayoutDescriptor;

        for (const resourceName in bindingResourceInfoMap)
        {
            const bindingResourceInfo = bindingResourceInfoMap[resourceName];

            const { group, variableInfo, entry: entry1 } = bindingResourceInfo;

            gpuSetBindGroups[group] = gpuSetBindGroups[group] || {
                bindGroup: {
                    layout: { ...pipelineLayout.bindGroupLayouts[group] },
                    entries: [],
                }
            };

            const entry: IGPUBindGroupEntry = { binding: entry1.binding, resource: null };
            gpuSetBindGroups[group].bindGroup.entries.push(entry);

            // eslint-disable-next-line no-loop-func
            const getResource = () =>
            {
                const bindingResource = bindingResources[resourceName];
                console.assert(!!bindingResource, `在绑定资源中没有找到 ${resourceName} 。`);

                let resource: IGPUBindingResource;
                //
                if (entry1.buffer)
                {
                    const layoutType = entry1.buffer.type;

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
                else if (entry1.sampler)
                {
                    const uniformData = bindingResource as IGPUSampler;

                    resource = uniformData;
                }
                else if (entry1.texture)
                {
                    const uniformData = bindingResource as IGPUTextureView;

                    // 设置纹理资源布局上的采样类型。
                    if ((uniformData.texture as IGPUTextureBase).sampleType === "unfilterable-float")
                    {
                        entry1.texture.sampleType = "unfilterable-float";
                    }

                    resource = uniformData;
                }
                else if (entry1.externalTexture)
                {
                    const uniformData = bindingResource as IGPUExternalTexture;

                    resource = uniformData;
                }
                else if (entry1.storageTexture)
                {
                    const uniformData = bindingResource as IGPUTextureView;

                    resource = uniformData;
                }
                else
                {
                    throw `未解析 ${variableInfo.resourceType}`;
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

        bindGroupsMap.set([layout, bindingResources], gpuSetBindGroups);
    }

    return gpuSetBindGroups;
}

const bindGroupsMap = new ChainMap<[IGPUPipelineLayoutDescriptor, IGPUBindingResources], IGPUSetBindGroup[]>();

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
