import { IGPURenderPassDescriptor, IGPURenderPassColorAttachment, IGPURenderPassDepthStencilAttachment } from '../data/IGPURenderPassEncoder';
import { IGPUTexture } from '../data/IGPUTexture';
import { setIGPUTextureSize } from './getGPUTexture';
import { getGPUTextureView } from './getGPUTextureView';

/**
 * 获取GPU渲染通道描述。
 *
 * @param device GPU设备。
 * @param renderPass 渲染通道描述。
 * @returns GPU渲染通道描述。
 */
export function getGPURenderPassDescriptor(device: GPUDevice, renderPass: IGPURenderPassDescriptor): GPURenderPassDescriptor
{
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
            const attachment: GPURenderPassColorAttachment = {
                ...v,
                view,
                resolveTarget,
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

/**
 * 更新渲染通道附件尺寸，使得附件上纹理尺寸一致。
 *
 * @param renderPass 渲染通道描述。
 * @param attachmentSize 附件尺寸。
 */
export function updateIGPURenderPassAttachmentSize(renderPass: IGPURenderPassDescriptor, attachmentSize: { width: number; height: number; })
{
    const attachmentTextures = getIGPURenderPassAttachmentTextures(renderPass.colorAttachments, renderPass.depthStencilAttachment);
    attachmentTextures.forEach((v) => setIGPUTextureSize(v, attachmentSize));
}

/**
 * 获取渲染通道附件上的纹理描述列表。
 *
 * @param colorAttachments 颜色附件列表。
 * @param depthStencilAttachment 深度模板附件。
 * @returns 渲染通道附件上的纹理描述列表。
 */
function getIGPURenderPassAttachmentTextures(colorAttachments: IGPURenderPassColorAttachment[], depthStencilAttachment?: IGPURenderPassDepthStencilAttachment)
{
    const textures: IGPUTexture[] = [];

    for (let i = 0; i < colorAttachments.length; i++)
    {
        const element = colorAttachments[i];
        if (element.view)
        {
            textures.push(element.view.texture);
        }
        if (element.resolveTarget)
        {
            textures.push(element.resolveTarget.texture);
        }
    }

    if (depthStencilAttachment)
    {
        if (depthStencilAttachment.view)
        {
            textures.push(depthStencilAttachment.view.texture);
        }
        if (depthStencilAttachment.resolveTarget)
        {
            textures.push(depthStencilAttachment.resolveTarget.texture);
        }
    }

    return textures;
}
