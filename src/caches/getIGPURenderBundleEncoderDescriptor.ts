import { IGPURenderBundleEncoderDescriptor } from "../data/IGPURenderBundleObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getIRenderPassColorAttachmentFormats } from "./getIRenderPassColorAttachmentFormats";
import { getIRenderPassDepthStencilAttachmentFormats } from "./getIRenderPassDepthStencilAttachmentFormats";

export function getIGPURenderBundleEncoderDescriptor(device: GPUDevice, renderBundleEncoderDescriptor: IGPURenderBundleEncoderDescriptor, renderPass: IGPURenderPassDescriptor)
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

/**
 * 获取渲染通道附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道附件纹理格式。
 */
function getIRenderPassFormats(device: GPUDevice, renderPass: IGPURenderPassDescriptor)
{
    const colorAttachmentTextureFormats = getIRenderPassColorAttachmentFormats(device, renderPass);

    const depthStencilAttachmentTextureFormat = getIRenderPassDepthStencilAttachmentFormats(device, renderPass);

    return { colorAttachmentTextureFormats, depthStencilAttachmentTextureFormat };
}
