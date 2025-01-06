
import { IGPUBindGroupLayoutDescriptor, IGPUPipelineLayoutDescriptor } from "../internal/IGPUPipelineLayoutDescriptor";
import { getIGPUBindGroupLayoutEntryMap, IGPUBindGroupLayoutEntryMap } from "./getWGSLReflectInfo";

export type IGPUShader = { readonly vertex?: string, readonly fragment?: string, readonly compute?: string };

export function getIGPUShaderKey(shader: IGPUShader)
{
    return shader.vertex + shader.fragment + shader.compute;
}

/**
 * 从GPU管线中获取管线布局。
 *
 * @param shader GPU管线。
 * @returns 管线布局。
 */
export function getIGPUPipelineLayout(shader: IGPUShader): IGPUPipelineLayoutDescriptor
{
    const shaderKey = getIGPUShaderKey(shader);

    //
    let gpuPipelineLayout = gpuPipelineLayoutMap[shaderKey];
    if (gpuPipelineLayout) return gpuPipelineLayout;

    const vertexCode = shader.vertex;
    const fragmentCode = shader.fragment;
    const computeCode = shader.compute;

    let entryMap: IGPUBindGroupLayoutEntryMap = {};
    if (vertexCode)
    {
        const vertexEntryMap = getIGPUBindGroupLayoutEntryMap(vertexCode);
        entryMap = mergeBindGroupLayouts(entryMap, vertexEntryMap);
    }
    if (fragmentCode && fragmentCode !== vertexCode)
    {
        const fragmentEntryMap = getIGPUBindGroupLayoutEntryMap(fragmentCode);
        entryMap = mergeBindGroupLayouts(entryMap, fragmentEntryMap);
    }
    if (computeCode && computeCode !== vertexCode && computeCode !== fragmentCode)
    {
        const computeEntryMap = getIGPUBindGroupLayoutEntryMap(computeCode);
        entryMap = mergeBindGroupLayouts(entryMap, computeEntryMap);
    }

    //
    const bindGroupLayouts: IGPUBindGroupLayoutDescriptor[] = [];
    for (const resourceName in entryMap)
    {
        const bindGroupLayoutEntry = entryMap[resourceName];
        const { group, binding } = bindGroupLayoutEntry.variableInfo;
        //
        const bindGroupLayout = bindGroupLayouts[group] = bindGroupLayouts[group] || { entries: [], entryNames: [] };

        // 检测相同位置是否存在多个定义
        if (bindGroupLayout.entries[binding])
        {
            // 存在重复定义时，判断是否兼容
            const preEntry = bindGroupLayout.entries[binding];
            console.error(`在管线中 @group(${group}) @binding(${binding}) 处存在多个定义 ${preEntry.variableInfo.name} ${resourceName} 。`);
        }

        //
        bindGroupLayout.entries[binding] = bindGroupLayoutEntry;
        bindGroupLayout.entryNames.push(resourceName);
    }

    // 排除 undefined 元素。
    for (let i = 0; i < bindGroupLayouts.length; i++)
    {
        const entries = bindGroupLayouts[i].entries as GPUBindGroupLayoutEntry[];
        for (let i = entries.length - 1; i >= 0; i--)
        {
            if (!entries[i])
            {
                entries.splice(i, 1);
            }
        }
    }

    //
    gpuPipelineLayout = gpuPipelineLayoutMap[shaderKey] = { bindGroupLayouts };

    return gpuPipelineLayout;
}

function mergeBindGroupLayouts(entryMap: IGPUBindGroupLayoutEntryMap, entryMap1: IGPUBindGroupLayoutEntryMap): IGPUBindGroupLayoutEntryMap
{
    for (const resourceName in entryMap1)
    {
        // 检测相同名称是否被定义在多个地方
        if (entryMap[resourceName])
        {
            const preEntry = entryMap[resourceName].variableInfo;
            const currentEntry = entryMap1[resourceName].variableInfo;

            if (preEntry.group !== currentEntry.group
                || preEntry.binding !== currentEntry.binding
                || preEntry.resourceType !== currentEntry.resourceType
            )
            {
                console.warn(`分别在 着色器 @group(${preEntry.group}) @binding(${preEntry.binding}) 与 @group(${currentEntry.group}) @binding(${currentEntry.binding}) 处存在相同名称的变量 ${currentEntry.name} 。`);
            }
        }
        entryMap[resourceName] = entryMap1[resourceName];
    }

    return entryMap;
}

const gpuPipelineLayoutMap: { [key: string]: IGPUPipelineLayoutDescriptor } = {};
