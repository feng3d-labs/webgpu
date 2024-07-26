import { IGPUCommandEncoder, IGPUPassEncoder } from "../data/IGPUCommandEncoder";
import { IGPUComputePassEncoder } from "../data/IGPUComputePassEncoder";
import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";
import { IGPURenderPassEncoder } from "../data/IGPURenderPassEncoder";
import { IGPUSubmit } from "../data/IGPUSubmit";

export function getIGPUSubmit(device: GPUDevice, data: IGPUSubmit)
{
    const commandEncoders = data.commandEncoders.map((v) => getIGPUCommandEncoder(device, v));

    const gpuSubmit: IGPUSubmit = {
        commandEncoders,
    };

    return gpuSubmit;
}

function getIGPUCommandEncoder(device: GPUDevice, v: IGPUCommandEncoder)
{
    const passEncoders = v.passEncoders.map((v) =>
    {
        let gpuPassEncoder: IGPUPassEncoder;
        if (isIRenderPassEncoder(v))
        {
            gpuPassEncoder = getIGPURenderPassEncoder(device, v);
        }
        else if (isIComputePassEncoder(v))
        {
            gpuPassEncoder = getIComputePassEncoder(v);
        }
        else if (isICopyTextureToTexture(v))
        {
            gpuPassEncoder = getIGPUCopyTextureToTexture(v);
        }
        else if (isICopyBufferToBuffer(v))
        {
            gpuPassEncoder = getIGPUCopyBufferToBuffer(v);
        }
        else
        {
            throw `未处理通道编码器 ${v}`;
        }

        return gpuPassEncoder;
    });

    const gpuCommandEncoder: IGPUCommandEncoder = {
        passEncoders,
    };

    return gpuCommandEncoder;
}

function isIComputePassEncoder(arg: any): arg is IGPUComputePassEncoder
{
    return !!(arg as IGPUComputePassEncoder).computeObjects;
}

function isIRenderPassEncoder(arg: any): arg is IGPURenderPassEncoder
{
    return !!(arg as IGPURenderPassEncoder).renderPass;
}

function isICopyTextureToTexture(arg: any): arg is IGPUCopyTextureToTexture
{
    return !!(arg as IGPUCopyTextureToTexture).source?.texture;
}

function isICopyBufferToBuffer(arg: any): arg is IGPUCopyBufferToBuffer
{
    const source = (arg as IGPUCopyBufferToBuffer).source;
    const destination = (arg as IGPUCopyBufferToBuffer).destination;

    // 缓冲区必定给出尺寸 或者 数据。
    if (!(source.size || source.data)) return false;
    if (!(destination.size || destination.data)) return false;

    return true;
}

function getIGPUCopyTextureToTexture(v: IGPUCopyTextureToTexture)
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

function getIGPUCopyBufferToBuffer(v: IGPUCopyBufferToBuffer)
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

function getIComputePassEncoder(computePassEncoder: IGPUComputePassEncoder)
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
import { IGPURenderObject } from "../data/IGPURenderObject";
import { getIGPURenderObject } from "./getIGPURenderObject";
import { getIGPURenderPass } from "./getIGPURenderPass";

function getIGPURenderPassEncoder(device: GPUDevice, renderPassEncoder: IGPURenderPassEncoder)
{
    const renderPass = getIGPURenderPass(device, renderPassEncoder.renderPass);

    const renderObjects = renderPassEncoder.renderObjects.map((v) =>
    {
        if (isRenderBundle(v))
        {
            const gpuRenderObject = getIGPURenderBundle(device, v, renderPassEncoder.renderPass);

            return gpuRenderObject;
        }

        const gpuRenderObject = getIGPURenderObject(device, v, renderPassEncoder.renderPass);

        return gpuRenderObject;
    });

    const gpuRenderPassEncoder: IGPURenderPassEncoder = {
        renderPass,
        renderObjects,
    };

    return gpuRenderPassEncoder;
}

function isRenderBundle(arg: IGPURenderObject | IGPURenderBundleObject): arg is IGPURenderBundleObject
{
    return !!(arg as IGPURenderBundleObject).renderObjects;
}

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
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassEncoder";
import { getIRenderPassFormats } from "./getIGPURenderPass";

export function getIGPURenderBundle(device: GPUDevice, renderBundleObject: IGPURenderBundleObject, renderPass: IGPURenderPassDescriptor)
{
    let gpuRenderBundleObject: IGPURenderBundleObject = gpuRenderBundleObjectMap.get(renderBundleObject);
    if (gpuRenderBundleObject)
    {
        return gpuRenderBundleObject;
    }

    // 获取渲染通道附件纹理格式。
    const { colorAttachmentTextureFormats, depthStencilAttachmentTextureFormat } = getIRenderPassFormats(device, renderPass);

    const renderBundle: IGPURenderBundleEncoderDescriptor = {
        ...renderBundleObject.renderBundle,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        sampleCount: renderPass.multisample,
    };

    const renderObjects = renderBundleObject.renderObjects.map((v) => getIGPURenderObject(device, v, renderPass));

    gpuRenderBundleObject = {
        renderBundle,
        renderObjects,
    };

    gpuRenderBundleObjectMap.set(renderBundleObject, gpuRenderBundleObject);

    return gpuRenderBundleObject;
}
const gpuRenderBundleObjectMap = new WeakMap<IGPURenderBundleObject, IGPURenderBundleObject>();
