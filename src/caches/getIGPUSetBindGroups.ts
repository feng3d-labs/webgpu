import { watcher } from "@feng3d/watcher";

import { IUniforms } from "@feng3d/render-api";
import { getIGPUPipelineLayout, getIGPUShaderKey, IGPUShader } from "../caches/getIGPUPipelineLayout";
import { IGPUBufferBinding } from "../data/IGPUBufferBinding";
import { IGPUBindGroupEntry } from "../internal/IGPUBindGroupDescriptor";
import { IGPUBindGroupLayoutDescriptor } from "../internal/IGPUPipelineLayoutDescriptor";
import { IGPUSetBindGroup } from "../internal/IGPUSetBindGroup";
import { ChainMap } from "../utils/ChainMap";
import { updateBufferBinding } from "../utils/updateBufferBinding";

export function getIGPUSetBindGroups(shader: IGPUShader, bindingResources: IUniforms)
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

const bindGroupsMap = new ChainMap<[string, IUniforms], IGPUSetBindGroup[]>();

function getIGPUSetBindGroup(bindGroupLayout: IGPUBindGroupLayoutDescriptor, bindingResources: IUniforms): IGPUSetBindGroup
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

        const getResource = () =>
        {
            const bindingResource = bindingResources[resourceName];
            console.assert(!!bindingResource, `在绑定资源中没有找到 ${resourceName} 。`);

            //
            if (entry1.buffer)
            {
                // 更新缓冲区绑定的数据。
                updateBufferBinding(variableInfo, bindingResource as IGPUBufferBinding);
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

    return setBindGroup;
}
