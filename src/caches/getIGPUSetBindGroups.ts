import { watcher } from "@feng3d/watcher";

import { BufferBinding, Uniforms } from "@feng3d/render-api";
import { getIGPUPipelineLayout, getIGPUShaderKey, IGPUShader } from "../caches/getIGPUPipelineLayout";
import { BindGroupLayoutDescriptor } from "../internal/PipelineLayoutDescriptor";
import { ChainMap } from "../utils/ChainMap";
import { getBufferBindingInfo, IBufferBindingInfo } from "../utils/getBufferBindingInfo";
import { updateBufferBinding } from "../utils/updateBufferBinding";
import { getIGPUBuffer } from "./getIGPUBuffer";
import { IGPUBindGroupDescriptor, IGPUBindGroupEntry } from "./getGPUBindGroup";

export function getIGPUSetBindGroups(shader: IGPUShader, bindingResources: Uniforms)
{
    const shaderKey = getIGPUShaderKey(shader);
    //
    let gpuSetBindGroups = bindGroupsMap.get([shaderKey, bindingResources]);
    if (gpuSetBindGroups) return gpuSetBindGroups;

    gpuSetBindGroups = [];
    bindGroupsMap.set([shaderKey, bindingResources], gpuSetBindGroups);

    //
    const layout = getIGPUPipelineLayout(shader);
    layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
    {
        gpuSetBindGroups[group] = getIGPUSetBindGroup(bindGroupLayout, bindingResources);
    });

    return gpuSetBindGroups;
}

const bindGroupsMap = new ChainMap<[string, Uniforms], IGPUSetBindGroup[]>();

function getIGPUSetBindGroup(bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: Uniforms): IGPUSetBindGroup
{
    const map: ChainMap<Array<any>, IGPUSetBindGroup> = bindGroupLayout["_bindingResources"] = bindGroupLayout["_bindingResources"] || new ChainMap();
    const subBindingResources = bindGroupLayout.entryNames.map((v) => bindingResources[v]);
    let setBindGroup: IGPUSetBindGroup = map.get(subBindingResources);
    if (setBindGroup) return setBindGroup;

    const entries: IGPUBindGroupEntry[] = [];
    setBindGroup = { bindGroup: { layout: bindGroupLayout, entries } };
    map.set(subBindingResources, setBindGroup);

    //
    bindGroupLayout.entries.forEach((entry1) =>
    {
        const { variableInfo, binding } = entry1;
        //
        const entry: IGPUBindGroupEntry = { binding, resource: null };

        entries.push(entry);

        const resourceName = variableInfo.name;

        const updateResource = () =>
        {
            const bindingResource = bindingResources[resourceName];
            console.assert(!!bindingResource, `在绑定资源中没有找到 ${resourceName} 。`);

            //
            if (entry1.buffer)
            {
                const bufferBinding = ((typeof bindingResource === "number") ? [bindingResource] : bindingResource) as BufferBinding; // 值为number且不断改变时将可能会产生无数细碎gpu缓冲区。
                const bufferBindingInfo: IBufferBindingInfo = variableInfo["_bufferBindingInfo"] ||= getBufferBindingInfo(variableInfo.type);
                // 更新缓冲区绑定的数据。
                updateBufferBinding(resourceName, bufferBindingInfo, bufferBinding);
                //
                const buffer = getIGPUBuffer(bufferBinding.bufferView);
                (buffer as any).label = buffer.label || (`BufferBinding ${variableInfo.name}`);
                //
                entry.resource = bufferBinding;
            }
            else
            {
                entry.resource = bindingResource;
            }
        };

        //
        updateResource();
        watcher.watch(bindingResources, resourceName, updateResource);
    });

    return setBindGroup;
}

/**
 * GPU渲染时使用的绑定组。
 *
 * {@link GPUBindingCommandsMixin.setBindGroup}
 */
interface IGPUSetBindGroup
{
    /**
     * GPU绑定组。
     *
     * Bind group to use for subsequent render or compute commands.
     */
    bindGroup: IGPUBindGroupDescriptor;

    /**
     * Array containing buffer offsets in bytes for each entry in `bindGroup` marked as {@link GPUBindGroupLayoutEntry#buffer}.{@link GPUBufferBindingLayout#hasDynamicOffset}.-->
     */
    dynamicOffsets?: number[];
}
