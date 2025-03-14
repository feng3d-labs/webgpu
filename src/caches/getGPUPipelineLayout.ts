import { VariableInfo } from "wgsl_reflect";
import { getIGPUBindGroupLayoutEntryMap, GPUBindGroupLayoutEntryMap } from "./getWGSLReflectInfo";

declare global
{
    interface GPUPipelineLayout
    {
        /**
         * 绑定组布局列表。
         *
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        bindGroupLayouts: GPUBindGroupLayout[];
    }

    interface GPUBindGroupLayout
    {
        /**
         * 绑定组布局的入口列表。
         *
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        entries: GPUBindGroupLayoutEntry[];

        /**
         * 用于判断布局信息是否相同的标识。
         *
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        key: string,
    }

    interface GPUBindGroupLayoutEntry
    {
        /**
         * 绑定资源变量信息。
         * 
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        variableInfo: VariableInfo;

        /**
         * 用于判断布局信息是否相同的标识。
         * 
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        key: string;
    }
}

export function getGPUPipelineLayout(device: GPUDevice, shader: IGPUShader): GPUPipelineLayout
{
    const shaderKey = shader.vertex + shader.fragment + shader.compute;

    //
    let gpuPipelineLayout = gpuPipelineLayoutMap0[shaderKey];
    if (gpuPipelineLayout) return gpuPipelineLayout;

    const layout = getIGPUPipelineLayout(device, shader);

    gpuPipelineLayoutMap0[shaderKey] = layout;

    return layout;
}
const gpuPipelineLayoutMap0: { [key: string]: GPUPipelineLayout } = {};

export type IGPUShader = { readonly vertex?: string, readonly fragment?: string, readonly compute?: string };

/**
 * 从GPU管线中获取管线布局。
 *
 * @param shader GPU管线。
 * @returns 管线布局。
 */
function getIGPUPipelineLayout(device: GPUDevice, shader: IGPUShader)
{
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

    // 绑定组布局描述列表。
    const bindGroupLayoutDescriptors: GPUBindGroupLayoutDescriptor[] = [];
    for (const resourceName in entryMap)
    {
        const bindGroupLayoutEntry = entryMap[resourceName];
        const { group, binding } = bindGroupLayoutEntry.variableInfo;
        //
        const bindGroupLayoutDescriptor = bindGroupLayoutDescriptors[group] = bindGroupLayoutDescriptors[group] || { entries: [] };

        // 检测相同位置是否存在多个定义
        if (bindGroupLayoutDescriptor.entries[binding])
        {
            // 存在重复定义时，判断是否兼容
            const preEntry = bindGroupLayoutDescriptor.entries[binding];
            console.error(`在管线中 @group(${group}) @binding(${binding}) 处存在多个定义 ${preEntry.variableInfo.name} ${resourceName} ！`);
        }

        //
        bindGroupLayoutDescriptor.entries[binding] = bindGroupLayoutEntry;
    }

    // 绑定组布局列表。
    const bindGroupLayouts = bindGroupLayoutDescriptors.map((descriptor) =>
    {
        // 排除 undefined 元素。
        const entries = (descriptor.entries as GPUBindGroupLayoutEntry[]).filter((v) => !!v);
        const key = entries.map((v) => v.key).join(",");
        // 相同的布局只保留一个。
        if (__DEV__)
        {
            if (bindGroupLayoutMap[key])
            {
                console.log(`命中相同的布局 ${key}，公用绑定组布局对象。`);
            }
        }
        const bindGroupLayout: GPUBindGroupLayout = bindGroupLayoutMap[key] = bindGroupLayoutMap[key] || device.createBindGroupLayout({ entries, label: key });
        bindGroupLayout.entries = entries;
        bindGroupLayout.key = key;
        return bindGroupLayout;
    });

    // 管线布局描述标识符。
    const pipelineLayoutKey = bindGroupLayouts.map((v, i) => `[${i}: ${v.key}]`).join(",");
    if (__DEV__)
    {
        if (pipelineLayoutDescriptorMap[pipelineLayoutKey]) 
        {
            console.log(`命中相同的布局 ${pipelineLayoutKey}，公用管线布局对象。`);
        }
    }
    const gpuPipelineLayout: GPUPipelineLayout = pipelineLayoutDescriptorMap[pipelineLayoutKey] = pipelineLayoutDescriptorMap[pipelineLayoutKey] || device.createPipelineLayout({
        bindGroupLayouts,
    });
    gpuPipelineLayout.bindGroupLayouts = bindGroupLayouts;

    return gpuPipelineLayout;
}

const bindGroupLayoutMap: { [key: string]: GPUBindGroupLayout } = {};
const pipelineLayoutDescriptorMap: { [key: string]: GPUPipelineLayout } = {};

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
