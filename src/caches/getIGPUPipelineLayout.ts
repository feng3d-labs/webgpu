import { IComputePipeline } from "../data/IComputeObject";
import { IRenderPipeline } from "../data/IRenderPipeline";
import { IGPUShaderStageFlags, IGPUBindGroupLayoutDescriptor, IGPUBindGroupLayoutEntry } from "../webgpu-data-driven/data/IGPUBindGroup";
import { IGPUComputePipeline } from "../webgpu-data-driven/data/IGPUComputeObject";
import { IGPUPipelineLayout } from "../webgpu-data-driven/data/IGPUPipelineLayout";
import { WGSLBindingResourceInfo, WGSLBindingResourceInfoMap, getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 从GPU管线中获取管线布局。
 *
 * @param pipeline GPU管线。
 * @returns 管线布局。
 */
export function getIGPUPipelineLayout(pipeline: IRenderPipeline | IComputePipeline)
{
    const vertexCode = (pipeline as IRenderPipeline).vertex?.code;
    const fragmentCode = (pipeline as IRenderPipeline).fragment?.code;
    const computeCode = (pipeline as IGPUComputePipeline).compute?.code;
    //
    const code = vertexCode + fragmentCode + computeCode;
    //
    let result = gpuPipelineLayoutMap.get(code);
    if (result)
    {
        return result;
    }

    const bindingResourceInfoMap = {};
    const visibility: IGPUShaderStageFlags[] = [];
    if (vertexCode)
    {
        visibility.push("VERTEX");
        const vertexResourceInfoMap = getWGSLReflectInfo(vertexCode).bindingResourceLayoutMap;
        Object.assign(bindingResourceInfoMap, vertexResourceInfoMap);
    }
    if (fragmentCode)
    {
        const fragmentResourceInfoMap = getWGSLReflectInfo(fragmentCode).bindingResourceLayoutMap;
        visibility.push("FRAGMENT");
        Object.assign(bindingResourceInfoMap, fragmentResourceInfoMap);
    }
    if (computeCode)
    {
        visibility.push("COMPUTE");
        const computeResourceInfoMap = getWGSLReflectInfo(computeCode).bindingResourceLayoutMap;
        Object.assign(bindingResourceInfoMap, computeResourceInfoMap);
    }

    // 用于判断是否重复
    const tempMap: { [group: string]: { [binding: string]: WGSLBindingResourceInfo } } = {};
    //
    const bindGroupLayouts: IGPUBindGroupLayoutDescriptor[] = [];
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
        bindGroupLayout.entries.push(entry);
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
    gpuPipelineLayout: IGPUPipelineLayout,
    /**
     * WebGPU着色器中绑定资源映射。
     */
    bindingResourceInfoMap: WGSLBindingResourceInfoMap
}>();

function getIGPUBindGroupLayoutEntry(bindingResourceInfo: WGSLBindingResourceInfo, visibility: IGPUShaderStageFlags[])
{
    const { binding, buffer, texture, storageTexture, externalTexture, sampler } = bindingResourceInfo;

    const entry: IGPUBindGroupLayoutEntry = {
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
