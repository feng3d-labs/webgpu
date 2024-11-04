import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getGPUTextureFormat } from "./getGPUTextureFormat";
import { getIGPURenderPass } from "./getIGPURenderPass";

/**
 * 获取渲染通道颜色附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道颜色附件纹理格式。
 */
export function getIRenderPassColorAttachmentFormats(device: GPUDevice, renderPass: IGPURenderPassDescriptor)
{
    const gpuRenderPass = getIGPURenderPass(device, renderPass);

    const colorAttachmentTextureFormats = gpuRenderPass.colorAttachments.map((v) =>
    {
        if (!v) return undefined;

        return getGPUTextureFormat(device, v.view.texture);
    });

    return colorAttachmentTextureFormats;
}
