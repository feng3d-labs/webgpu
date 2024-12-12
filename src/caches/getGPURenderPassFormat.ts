import { IRenderPassDescriptor } from "@feng3d/render-api";
import { getGPUTextureFormat } from "../caches/getGPUTextureFormat";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";

/**
 * 获取渲染通道格式。
 *
 * @param descriptor 渲染通道描述。
 * @returns
 */
export function getGPURenderPassFormat(descriptor: IRenderPassDescriptor): IGPURenderPassFormat
{
    let gpuRenderPassFormat: IGPURenderPassFormat = descriptor[_RenderPassFormat];
    if (gpuRenderPassFormat) return gpuRenderPassFormat;

    const colorAttachmentTextureFormats = descriptor.colorAttachments.map((v) => getGPUTextureFormat(v.view.texture));

    let depthStencilAttachmentTextureFormat: GPUTextureFormat;
    if (descriptor.depthStencilAttachment)
    {
        depthStencilAttachmentTextureFormat = getGPUTextureFormat(descriptor.depthStencilAttachment.view?.texture) || "depth24plus";
    }

    const _key = `${colorAttachmentTextureFormats.toString()}|${depthStencilAttachmentTextureFormat}|${descriptor.sampleCount}`;

    descriptor[_RenderPassFormat] = gpuRenderPassFormat = {
        attachmentSize: descriptor.attachmentSize,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        sampleCount: descriptor.sampleCount,
        _key,
    };

    return gpuRenderPassFormat;
}

const _RenderPassFormat = "_RenderPassFormat";