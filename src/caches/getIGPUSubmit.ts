import { IGPUComputePassEncoder } from "../data/IGPUComputePassEncoder";
import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";

export function getIGPUCopyTextureToTexture(v: IGPUCopyTextureToTexture)
{
    const sourceTexture = v.source.texture;
    const destinationTexture = v.destination.texture;

    const gpuCopyTextureToTexture: IGPUCopyTextureToTexture = {
        ...v,
        source: { texture: sourceTexture },
        destination: { texture: destinationTexture },
    };

    return gpuCopyTextureToTexture;
}

export function getIGPUCopyBufferToBuffer(v: IGPUCopyBufferToBuffer)
{
    const source = v.source;
    const destination = v.destination;

    let { sourceOffset, destinationOffset, size } = v;

    if (sourceOffset === undefined) sourceOffset = 0;
    if (destinationOffset === undefined) destinationOffset = 0;
    if (size === undefined) size = source.size;

    const gpuCopyTextureToTexture: IGPUCopyBufferToBuffer = {
        source,
        sourceOffset,
        destination,
        destinationOffset,
        size,
    };

    return gpuCopyTextureToTexture;
}

export function getIComputePassEncoder(computePassEncoder: IGPUComputePassEncoder)
{
    const computePass = computePassEncoder.computePass;

    const computeObjects = computePassEncoder.computeObjects.map((v) => getIGPUComputeObject(v));

    const gpuComputePassEncoder: IGPUComputePassEncoder = {
        computePass,
        computeObjects,
    };

    return gpuComputePassEncoder;
}

import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { getIGPURenderObject } from "./getIGPURenderObject";

import { IGPUComputeObject, IGPUComputePipeline } from "../data/IGPUComputeObject";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";
import { getIGPUSetBindGroups } from "./getIGPUSetBindGroups";
import { WGSLBindingResourceInfoMap } from "./getWGSLReflectInfo";

function getIGPUComputeObject(renderObject: IGPUComputeObject)
{
    const { gpuComputePipeline, bindingResourceInfoMap } = getIGPUComputePipeline(renderObject.pipeline);

    const gpuComputeObject: IGPUComputeObject = {
        ...renderObject,
        pipeline: gpuComputePipeline,
    };

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(gpuComputePipeline, renderObject.bindingResources, bindingResourceInfoMap);

    gpuComputeObject.bindGroups = bindGroups;

    return gpuComputeObject;
}

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *获取完整的计算管线描述。
 *
 * @param computePipeline 计算管线描述。
 * @returns 完整的计算管线描述。
 */
export function getIGPUComputePipeline(computePipeline: IGPUComputePipeline)
{
    let result = computePipelineMap.get(computePipeline);
    if (result)
    {
        return result;
    }

    const gpuComputeStage = getIGPUComputeStage(computePipeline.compute);

    // 从GPU管线中获取管线布局。
    const { gpuPipelineLayout, bindingResourceInfoMap } = getIGPUPipelineLayout(computePipeline);

    const gpuComputePipeline: IGPUComputePipeline = {
        ...computePipeline,
        layout: gpuPipelineLayout,
        compute: gpuComputeStage,
    };

    result = { gpuComputePipeline, bindingResourceInfoMap };

    computePipelineMap.set(computePipeline, result);

    return result;
}

const computePipelineMap = new Map<IGPUComputePipeline, { gpuComputePipeline: IGPUComputePipeline, bindingResourceInfoMap: WGSLBindingResourceInfoMap }>();

import { IGPUComputeStage, IGPUProgrammableStage } from "../data/IGPUComputeObject";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 获取计算阶段完整描述。
 *
 * @param computeStage 计算阶段描述。
 * @returns 计算阶段完整描述。
 */
export function getIGPUComputeStage(computeStage: IGPUProgrammableStage)
{
    let gpuComputeState = computeStateMap.get(computeStage);
    if (!gpuComputeState)
    {
        const code = computeStage.code;
        let entryPoint = computeStage.entryPoint;
        if (!entryPoint)
        {
            const reflect = getWGSLReflectInfo(code);
            console.assert(reflect.computeEntryList.length > 0, `WGSL着色器 ${code} 中不存在计算入口点。`);
            entryPoint = reflect.computeEntryList[0].entryPoint;
        }
        else
        {
            // 验证着色器中包含指定片段入口函数。
            const reflect = getWGSLReflectInfo(code);
            console.assert(!!reflect.computeEntryMap[entryPoint], `WGSL着色器 ${code} 中不存在指定的计算入口点 ${entryPoint}`);
        }

        gpuComputeState = {
            code,
            entryPoint,
        };

        if (computeStage.constants)
        {
            gpuComputeState.constants = computeStage.constants;
        }

        computeStateMap.set(computeStage, gpuComputeState);
    }

    return gpuComputeState;
}

const computeStateMap = new Map<IGPUProgrammableStage, IGPUComputeStage>();

import { IGPURenderBundleEncoderDescriptor } from "../data/IGPURenderBundleObject";
import { getIRenderPassFormats } from "./getIGPURenderPass";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";

export function getGPURenderBundleEncoderDescriptor(device: GPUDevice, renderBundleEncoderDescriptor: IGPURenderBundleEncoderDescriptor, renderPass: IGPURenderPassDescriptor)
{
    // 获取渲染通道附件纹理格式。
    const { colorAttachmentTextureFormats, depthStencilAttachmentTextureFormat } = getIRenderPassFormats(device, renderPass);

    const renderBundle: IGPURenderBundleEncoderDescriptor = {
        ...renderBundleEncoderDescriptor,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        sampleCount: renderPass.multisample,
    };

    return renderBundle;
}