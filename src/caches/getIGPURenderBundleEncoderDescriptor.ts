import { IGPURenderBundleEncoderDescriptor } from "../data/IGPURenderBundleObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getGPUTextureFormat } from "./getGPUTextureFormat";
import { getIRenderPassDepthStencilAttachmentFormat } from "./getIRenderPassDepthStencilAttachmentFormat";

export function getGPURenderBundleEncoderDescriptor(renderBundleEncoderDescriptor: IGPURenderBundleEncoderDescriptor, renderPass: IGPURenderPassDescriptor)
{
    // 获取渲染通道附件纹理格式。
    const { colorAttachmentTextureFormats, depthStencilAttachmentTextureFormat } = getIRenderPassFormats(renderPass);

    const renderBundle: GPURenderBundleEncoderDescriptor = {
        ...renderBundleEncoderDescriptor,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        sampleCount: renderPass.multisample,
    };

    return renderBundle;
}

/**
 * 获取渲染通道附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道附件纹理格式。
 */
function getIRenderPassFormats(renderPass: IGPURenderPassDescriptor)
{
    const colorAttachmentTextureFormats = renderPass.colorAttachments.map((v) =>
    {
        return getGPUTextureFormat(v.view.texture);
    });

    const depthStencilAttachmentTextureFormat = getIRenderPassDepthStencilAttachmentFormat(renderPass.depthStencilAttachment);

    return { colorAttachmentTextureFormats, depthStencilAttachmentTextureFormat };
}
