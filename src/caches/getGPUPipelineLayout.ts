import { BindGroupLayoutDescriptor, PipelineLayoutDescriptor } from "../internal/PipelineLayoutDescriptor";
import { getGPUBindGroupLayout } from "./getGPUBindGroupLayout";
import { getIGPUBindGroupLayoutEntryMap, GPUBindGroupLayoutEntryMap } from "./getWGSLReflectInfo";

declare global
{
    interface GPUPipelineLayout
    {
        bindGroupLayouts: BindGroupLayoutDescriptor[];
    }
}

export function getGPUPipelineLayout(device: GPUDevice, shader: IGPUShader): GPUPipelineLayout
{
    const shaderKey = shader.vertex + shader.fragment + shader.compute;

    //
    let gpuPipelineLayout = gpuPipelineLayoutMap0[shaderKey];
    if (gpuPipelineLayout) return gpuPipelineLayout;

    const layout = getIGPUPipelineLayout(shader);

    const bindGroupLayouts = layout.bindGroupLayouts.map((v) =>
    {
        const gBindGroupLayout = getGPUBindGroupLayout(device, v);

        return gBindGroupLayout;
    });
    const gPipelineLayout = device.createPipelineLayout({
        bindGroupLayouts,
    });
    gPipelineLayout.bindGroupLayouts = layout.bindGroupLayouts;
    gpuPipelineLayoutMap0[shaderKey] = gPipelineLayout;

    return gPipelineLayout;
}
const gpuPipelineLayoutMap0: { [key: string]: GPUPipelineLayout } = {};

export type IGPUShader = { readonly vertex?: string, readonly fragment?: string, readonly compute?: string };

/**
 * 从GPU管线中获取管线布局。
 *
 * @param shader GPU管线。
 * @returns 管线布局。
 */
function getIGPUPipelineLayout(shader: IGPUShader): PipelineLayoutDescriptor
{
    const shaderKey = shader.vertex + shader.fragment + shader.compute;

    //
    let gpuPipelineLayout = gpuPipelineLayoutMap[shaderKey];
    if (gpuPipelineLayout) return gpuPipelineLayout;

    const vertexCode = shader.vertex;
    const fragmentCode = shader.fragment;
    const computeCode = shader.compute;

    let entryMap: GPUBindGroupLayoutEntryMap = {};
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
    const bindGroupLayouts: BindGroupLayoutDescriptor[] = [];
    for (const resourceName in entryMap)
    {
        const bindGroupLayoutEntry = entryMap[resourceName];
        const { group, binding } = bindGroupLayoutEntry.variableInfo;
        //
        const bindGroupLayout = bindGroupLayouts[group] = bindGroupLayouts[group] || { entries: [], entryNames: [], key: "" };

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
        const bindGroupLayout = bindGroupLayouts[i];
        const entries = bindGroupLayout.entries as GPUBindGroupLayoutEntry[];
        for (let i = entries.length - 1; i >= 0; i--)
        {
            if (!entries[i])
            {
                entries.splice(i, 1);
            }
        }
        bindGroupLayout.key = bindGroupLayout.entries.map((v) => v.key).join(",");
        // 相同的布局只保留一个。
        if (__DEV__)
        {
            if (bindGroupLayoutMap[bindGroupLayout.key])
            {
                console.log(`命中相同的布局 ${bindGroupLayout.key}，公用绑定组布局对象。`);
            }
        }
        bindGroupLayouts[i] = bindGroupLayoutMap[bindGroupLayout.key] = bindGroupLayoutMap[bindGroupLayout.key] || bindGroupLayout;
    }

    const pipelineLayoutKey = bindGroupLayouts.map((v, i) => `[${i} ,${v.key}]`).join(",");
    // 相同的布局只保留一个。
    if (__DEV__)
    {
        if (pipelineLayoutDescriptorMap[pipelineLayoutKey]) 
        {
            console.log(`命中相同的布局 ${pipelineLayoutKey}，公用管线布局对象。`);
        }
    }
    gpuPipelineLayout = gpuPipelineLayoutMap[shaderKey] = pipelineLayoutDescriptorMap[pipelineLayoutKey]
        = pipelineLayoutDescriptorMap[pipelineLayoutKey] || { bindGroupLayouts, key: pipelineLayoutKey };

    return gpuPipelineLayout;
}

const bindGroupLayoutMap: { [key: string]: BindGroupLayoutDescriptor } = {};
const pipelineLayoutDescriptorMap: { [key: string]: PipelineLayoutDescriptor } = {};

function mergeBindGroupLayouts(entryMap: GPUBindGroupLayoutEntryMap, entryMap1: GPUBindGroupLayoutEntryMap): GPUBindGroupLayoutEntryMap
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

const gpuPipelineLayoutMap: { [key: string]: PipelineLayoutDescriptor } = {};
