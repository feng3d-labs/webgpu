import { IGPUComputePipeline } from "../data/IGPUComputeObject";
import { IGPURenderPipeline } from "../data/IGPURenderObject";
import { IGPUPipelineLayoutDescriptor } from "../internal/IGPUPipelineLayoutDescriptor";
import { WGSLBindingResourceInfo, WGSLBindingResourceInfoMap, getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 从GPU管线中获取管线布局。
 *
 * @param pipeline GPU管线。
 * @returns 管线布局。
 */
export function getIGPUPipelineLayout(pipeline: IGPURenderPipeline | IGPUComputePipeline)
{
    const vertexCode = (pipeline as IGPURenderPipeline).vertex?.code;
    const fragmentCode = (pipeline as IGPURenderPipeline).fragment?.code;
    const computeCode = (pipeline as IGPUComputePipeline).compute?.code;
    //
    const code = vertexCode + fragmentCode + computeCode;
    //
    let result = gpuPipelineLayoutMap.get(code);
    if (result) return result;

    const bindingResourceInfoMap = {};
    let visibility: GPUShaderStageFlags = 0;
    if (vertexCode)
    {
        visibility |= GPUShaderStage.VERTEX;
        const vertexResourceInfoMap = getWGSLReflectInfo(vertexCode).bindingResourceLayoutMap;
        Object.assign(bindingResourceInfoMap, vertexResourceInfoMap);
    }
    if (fragmentCode)
    {
        visibility |= GPUShaderStage.FRAGMENT;
        const fragmentResourceInfoMap = getWGSLReflectInfo(fragmentCode).bindingResourceLayoutMap;
        Object.assign(bindingResourceInfoMap, fragmentResourceInfoMap);
    }
    if (computeCode)
    {
        visibility |= GPUShaderStage.COMPUTE;
        const computeResourceInfoMap = getWGSLReflectInfo(computeCode).bindingResourceLayoutMap;
        Object.assign(bindingResourceInfoMap, computeResourceInfoMap);
    }

    // 用于判断是否重复
    const tempMap: { [group: string]: { [binding: string]: WGSLBindingResourceInfo } } = {};
    //
    const bindGroupLayouts: GPUBindGroupLayoutDescriptor[] = [];
    for (const resourceName in bindingResourceInfoMap)
    {
        const bindingResourceInfo = bindingResourceInfoMap[resourceName];
        const { group, binding } = bindingResourceInfo;

        // 检测相同位置是否存在多个定义
        const groupMap = tempMap[group] = tempMap[group] || {};
        if (groupMap[binding])
        {
            // 存在重复定义时，判断是否兼容
            const preEntry = groupMap[binding];
            console.error(`在管线中 @group(${group}) @binding(${binding}) 处存在多个定义 ${preEntry.name} ${resourceName} 。`);
        }
        groupMap[binding] = bindingResourceInfo;

        //
        const entry = getIGPUBindGroupLayoutEntry(bindingResourceInfo, visibility);
        //
        const bindGroupLayout = bindGroupLayouts[group] = bindGroupLayouts[group] || { entries: [] };
        (bindGroupLayout.entries as GPUBindGroupLayoutEntry[]).push(entry);
    }

    result = {
        gpuPipelineLayout: { bindGroupLayouts },
        bindingResourceInfoMap
    };

    gpuPipelineLayoutMap.set(code, result);

    return result;
}

const gpuPipelineLayoutMap = new Map<string, {
    /**
     * GPU管线布局。
     */
    gpuPipelineLayout: IGPUPipelineLayoutDescriptor,
    /**
     * WebGPU着色器中绑定资源映射。
     */
    bindingResourceInfoMap: WGSLBindingResourceInfoMap
}>();

function getIGPUBindGroupLayoutEntry(bindingResourceInfo: WGSLBindingResourceInfo, visibility: GPUShaderStageFlags)
{
    const { binding, buffer, texture, storageTexture, externalTexture, sampler } = bindingResourceInfo;

    const entry: GPUBindGroupLayoutEntry = {
        binding, visibility,
    };

    if (buffer)
    {
        entry.buffer = buffer.layout;
    }
    else if (sampler)
    {
        entry.sampler = sampler.layout;
    }
    else if (texture)
    {
        entry.texture = texture.layout;
    }
    else if (storageTexture)
    {
        entry.storageTexture = storageTexture.layout;
    }
    else if (externalTexture)
    {
        entry.externalTexture = externalTexture.layout;
    }
    else
    {
        throw ``;
    }

    return entry;
}
