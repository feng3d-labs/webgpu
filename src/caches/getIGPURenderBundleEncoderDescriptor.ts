import { IGPURenderBundleEncoderDescriptor } from "../data/IGPURenderBundleObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getGPUTextureFormat } from "./getGPUTextureFormat";

export function getGPURenderBundleEncoderDescriptor(renderBundleEncoderDescriptor: IGPURenderBundleEncoderDescriptor, renderPass: IGPURenderPassDescriptor)
{
    // 获取渲染通道附件纹理格式。
    const colorAttachmentTextureFormats = renderPass.colorAttachments.map((v) => getGPUTextureFormat(v.view.texture));

    let depthStencilAttachmentTextureFormat: GPUTextureFormat;
    if (renderPass.depthStencilAttachment)
    {
        depthStencilAttachmentTextureFormat = getGPUTextureFormat(renderPass.depthStencilAttachment.view?.texture) || "depth24plus";
    }

    const renderBundle: GPURenderBundleEncoderDescriptor = {
        ...renderBundleEncoderDescriptor,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        sampleCount: renderPass.multisample,
    };

    return renderBundle;
}
