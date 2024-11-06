import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getGPUTextureFormat } from "./getGPUTextureFormat";
import { getIGPURenderPass } from "./getIGPURenderPass";

/**
 * 获取渲染通道深度模板附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道深度模板附件纹理格式。
 */
export function getIRenderPassDepthStencilAttachmentFormats(renderPass: IGPURenderPassDescriptor)
{
    const gpuRenderPass = getIGPURenderPass(renderPass);

    let depthStencilAttachmentTextureFormat: GPUTextureFormat;
    if (gpuRenderPass.depthStencilAttachment)
    {
        depthStencilAttachmentTextureFormat = getGPUTextureFormat(gpuRenderPass.depthStencilAttachment.view.texture);
    }

    return depthStencilAttachmentTextureFormat;
}
