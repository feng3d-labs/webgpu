import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getGPUTextureView } from "./getGPUTextureView";
import { getIGPURenderPass } from "./getIGPURenderPass";

/**
 * 获取GPU渲染通道描述。
 *
 * @param device GPU设备。
 * @param renderPass 渲染通道描述。
 * @returns GPU渲染通道描述。
 */
export function getGPURenderPassDescriptor(device: GPUDevice, renderPass: IGPURenderPassDescriptor): GPURenderPassDescriptor
{
    renderPass = getIGPURenderPass(device, renderPass);

    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [],
    };
    if (renderPass.colorAttachments)
    {
        renderPass.colorAttachments.forEach((v, i) =>
        {
            if (!v) return;

            const view = getGPUTextureView(device, v.view);

            let resolveTarget: GPUTextureView;
            if (v.resolveTarget)
            {
                resolveTarget = getGPUTextureView(device, v.resolveTarget);
            }
            const loadOp = v.loadOp;
            const storeOp = v.storeOp;
            const attachment: GPURenderPassColorAttachment = {
                ...v,
                view,
                resolveTarget,
                loadOp,
                storeOp,
            };

            renderPassDescriptor.colorAttachments[i] = attachment;
        });
    }

    if (renderPass.depthStencilAttachment)
    {
        const depthStencilAttachment = renderPass.depthStencilAttachment;

        const view = getGPUTextureView(device, depthStencilAttachment.view);

        renderPassDescriptor.depthStencilAttachment = {
            ...depthStencilAttachment,
            view,
        };
    }

    return renderPassDescriptor;
}
