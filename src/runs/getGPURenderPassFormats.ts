import { getGPUTextureFormat } from "../caches/getGPUTextureFormat";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";

/**
 * 获取渲染通道格式。
 * 
 * @param descriptor 渲染通道描述。
 * @returns 
 */
export function getGPURenderPassFormats(descriptor: IGPURenderPassDescriptor): IGPURenderPassFormat
{
    let gpuRenderPassFormats = descriptor[_RenderPassFormats];
    if (gpuRenderPassFormats) return gpuRenderPassFormats;

    const colorAttachmentTextureFormats = descriptor.colorAttachments.map((v) => getGPUTextureFormat(v.view.texture));

    let depthStencilAttachmentTextureFormat: GPUTextureFormat;
    if (descriptor.depthStencilAttachment)
    {
        depthStencilAttachmentTextureFormat = getGPUTextureFormat(descriptor.depthStencilAttachment.view?.texture) || "depth24plus";
    }

    const multisample = descriptor.multisample;
    gpuRenderPassFormats = descriptor[_RenderPassFormats] = {
        attachmentSize: descriptor.attachmentSize,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        multisample
    };

    return gpuRenderPassFormats;
}

const _RenderPassFormats = "_RenderPassFormats";