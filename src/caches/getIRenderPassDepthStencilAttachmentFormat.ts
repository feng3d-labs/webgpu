import { IGPURenderPassDepthStencilAttachment } from "../data/IGPURenderPassDepthStencilAttachment";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getGPUTextureFormat } from "./getGPUTextureFormat";
import { getIGPURenderPass } from "./getIGPURenderPass";

/**
 * 获取渲染通道深度模板附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道深度模板附件纹理格式。
 */
export function getIRenderPassDepthStencilAttachmentFormat(depthStencilAttachment?: IGPURenderPassDepthStencilAttachment)
{
    let depthStencilAttachmentTextureFormat: GPUTextureFormat;
    if (depthStencilAttachment)
    {
        const texture = depthStencilAttachment.view?.texture;
        depthStencilAttachmentTextureFormat = texture ? getGPUTextureFormat(texture) : "depth24plus";
    }

    return depthStencilAttachmentTextureFormat;
}
