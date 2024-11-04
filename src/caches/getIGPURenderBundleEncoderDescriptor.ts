import { IGPURenderBundleEncoderDescriptor } from "../data/IGPURenderBundleObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getIRenderPassFormats } from "./getIGPURenderPass";

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