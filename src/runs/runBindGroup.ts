import { watcher } from "@feng3d/watcher";
import { TemplateInfo, VariableInfo } from "wgsl_reflect";
import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getIGPUPipelineLayout } from "../caches/getIGPUPipelineLayout";
import { IGPUBindGroupEntry, IGPUBufferBinding } from "../data/IGPUBindGroupDescriptor";
import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPUComputePipeline } from "../data/IGPUComputeObject";
import { IGPURenderPipeline, IGPUSetBindGroup } from "../data/IGPURenderObject";
import { IGPUPipelineLayoutDescriptor } from "../internal/IGPUPipelineLayoutDescriptor";
import { ChainMap } from "../utils/ChainMap";
import { getIGPUBuffer } from "./getIGPUIndexBuffer";

export function runBindGroup(device: GPUDevice, passEncoder: GPUBindingCommandsMixin, pipeline: IGPUComputePipeline | IGPURenderPipeline, bindingResources: IGPUBindingResources)
{
    // 计算 bindGroups
    const setBindGroups = getIGPUSetBindGroups(pipeline, bindingResources);

    setBindGroups?.forEach((setBindGroup, index) =>
    {
        const gpuBindGroup = getGPUBindGroup(device, setBindGroup.bindGroup);
        passEncoder.setBindGroup(index, gpuBindGroup, setBindGroup.dynamicOffsets);
    });
}

function getIGPUSetBindGroups(pipeline: IGPUComputePipeline | IGPURenderPipeline, bindingResources: IGPUBindingResources)
{
    //
    let gpuSetBindGroups = bindGroupsMap.get([pipeline, bindingResources]);
    if (gpuSetBindGroups) return gpuSetBindGroups;

    gpuSetBindGroups = [];
    bindGroupsMap.set([pipeline, bindingResources], gpuSetBindGroups);

    //
    const layout = getIGPUPipelineLayout(pipeline);
    layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
    {
        const entries: IGPUBindGroupEntry[] = [];
        gpuSetBindGroups[group] = { bindGroup: { layout: layout.bindGroupLayouts[group], entries: entries, } };

        bindGroupLayout.entries.forEach((entry1) =>
        {
            const { variableInfo, binding } = entry1;
            //
            const entry: IGPUBindGroupEntry = { binding: binding, resource: null };

            entries.push(entry);

            const resourceName = variableInfo.name;

            const getResource = () =>
            {
                const bindingResource = bindingResources[resourceName];
                console.assert(!!bindingResource, `在绑定资源中没有找到 ${resourceName} 。`);

                //
                if (entry1.buffer)
                {
                    //
                    const size = variableInfo.size;

                    const uniformData = bindingResource as IGPUBufferBinding;

                    // 是否存在默认值。
                    const hasDefautValue = !!uniformData.bufferView;
                    if (!uniformData.bufferView)
                    {
                        uniformData.bufferView = new Uint8Array(size);
                    }

                    // 更新缓冲区绑定的数据。
                    updateBufferBinding(variableInfo, uniformData, hasDefautValue);
                }

                return bindingResource;
            };

            entry.resource = getResource();

            //
            watcher.watch(bindingResources, resourceName, () =>
            {
                entry.resource = getResource();
            });
        });
    });

    return gpuSetBindGroups;
}

const bindGroupsMap = new ChainMap<[IGPUComputePipeline | IGPURenderPipeline, IGPUBindingResources], IGPUSetBindGroup[]>();

/**
 * 
 * @param variableInfo 
 * @param uniformData 
 * @param hasDefautValue 是否存在默认值。
 * @returns 
 */
function updateBufferBinding(variableInfo: VariableInfo, uniformData: IGPUBufferBinding, hasDefautValue: boolean)
{
    if (!variableInfo.members)
    {
        return;
    }

    if (uniformData["_variableInfo"] !== undefined)
    {
        const preVariableInfo = uniformData["_variableInfo"] as any as VariableInfo;
        if (preVariableInfo.group !== variableInfo.group
            || preVariableInfo.binding !== variableInfo.binding
            || preVariableInfo.resourceType !== variableInfo.resourceType
            || preVariableInfo.size !== variableInfo.size
        )
        {
            console.error(`updateBufferBinding 出现一份数据对应多个 variableInfo`);
        }

        return;
    }
    uniformData["_variableInfo"] = variableInfo as any;

    const buffer = getIGPUBuffer(uniformData.bufferView);
    buffer.label = buffer.label || ("uniformData " + autoVertexIndex++);
    const offset = uniformData.bufferView.byteOffset;

    variableInfo.members.forEach((member) =>
    {
        const subTypeName = (member.type as TemplateInfo).format?.name;
        const subsubTypeName = (member.type as any).format?.format?.name;

        let Cls: Float32ArrayConstructor | Int32ArrayConstructor;
        type Type = Float32Array | Int32Array;
        let ClsName: "Float32Array" | "Int32Array";
        const update = () =>
        {
            let data: Type;
            const memberData = uniformData[member.name];
            if (memberData === undefined)
            {
                if (!hasDefautValue)
                {
                    console.warn(`没有找到 binding ${member.name} 值！`);
                }

                return;
            }
            if (member.type.name === "f32" || subTypeName === "f32" || subsubTypeName === "f32")
            {
                Cls = Float32Array;
                ClsName = "Float32Array";
            }
            else if (member.type.name === "i32" || subTypeName === "i32" || subsubTypeName === "i32")
            {
                Cls = Int32Array;
                ClsName = "Int32Array";
            }
            else
            {
                console.error(`未处理缓冲区绑定类型为 ${member.type.name} 的 ${member.name} 成员！`);
            }
            if (typeof memberData === "number")
            {
                data = new Cls([memberData]);
            }
            else if ((memberData as ArrayBufferView).buffer)
            {
                data = new Cls((memberData as ArrayBufferView).buffer);
            }
            else if (memberData.constructor.name !== ClsName)
            {
                data = new Cls(memberData as ArrayLike<number>);
            }
            else
            {
                data = memberData as any;
            }
            const writeBuffers = buffer.writeBuffers ?? [];
            writeBuffers.push({ data: data.buffer, bufferOffset: offset + member.offset, size: member.size });
            buffer.writeBuffers = writeBuffers;
        };

        update();
        watcher.watch(uniformData, member.name as any, update);
    });
}

let autoVertexIndex = 0;