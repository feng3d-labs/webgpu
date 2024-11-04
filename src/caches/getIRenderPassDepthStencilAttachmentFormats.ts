import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getGPUTextureFormat } from "./getGPUTextureFormat";
import { getIGPURenderPass } from "./getIGPURenderPass";

/**
 * 获取渲染通道深度模板附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道深度模板附件纹理格式。
 */
export function getIRenderPassDepthStencilAttachmentFormats(device: GPUDevice, renderPass: IGPURenderPassDescriptor)
{
    const gpuRenderPass = getIGPURenderPass(device, renderPass);

    let depthStencilAttachmentTextureFormat: GPUTextureFormat;
    if (gpuRenderPass.depthStencilAttachment)
    {
        depthStencilAttachmentTextureFormat = getGPUTextureFormat(device, gpuRenderPass.depthStencilAttachment.view.texture);
    }

    return depthStencilAttachmentTextureFormat;
}
