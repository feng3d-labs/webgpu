import { watcher } from '@feng3d/watcher';
import { IGPURenderPassColorAttachment, IGPURenderPassDepthStencilAttachment, IGPURenderPassDescriptor, IGPUTexture, IGPUTextureView, internal } from 'webgpu-data-driven';

import { IAttachmentSize, IRenderPass, IRenderPassColorAttachment, IRenderPassDepthStencilAttachment } from '../data/IRenderPass';
import { ITexture } from '../data/ITexture';
import { getIGPUTextureSize, setITextureSize } from './getIGPUTexture';
import { getIGPUTextureView } from './getIGPUTextureView';

/**
 * 获取完整的渲染通道描述。
 *
 * @param renderPass 渲染通道描述。
 * @returns 完整的渲染通道描述。
 */
export function getIGPURenderPass(renderPass: IRenderPass)
{
    let iGPURenderPass = renderPassMap.get(renderPass);
    if (!iGPURenderPass)
    {
        // 更新渲染通道附件尺寸，使得附件上纹理尺寸一致。
        updateAttachmentSize(renderPass);

        // 获取颜色附件完整描述列表。
        const colorAttachments = getIGPURenderPassColorAttachments(renderPass.colorAttachments, renderPass.multisample);

        // 获取深度模板附件
        const depthStencilAttachment = getIGPURenderPassDepthStencilAttachment(renderPass.depthStencilAttachment, renderPass.attachmentSize, renderPass.multisample);

        // 附件尺寸变化时，渲染通道描述失效。
        const watchProperty = { attachmentSize: { width: 0, height: 0 } }; // 被监听的属性
        watcher.watchobject(renderPass, watchProperty, () =>
        {
            // 更新所有纹理描述中的尺寸
            updateAttachmentSize(renderPass);
            // 更新所有纹理尺寸
            const iGPURenderPass = renderPassMap.get(renderPass);
            // 由于深度纹理与多重采样纹理可能是引擎自动生成的，这部分纹理需要更新。
            internal.updateIGPURenderPassAttachmentSize(iGPURenderPass, renderPass.attachmentSize);
        });

        //
        iGPURenderPass = {
            ...renderPass,
            colorAttachments,
            depthStencilAttachment,
        };

        renderPassMap.set(renderPass, iGPURenderPass);
    }

    return iGPURenderPass;
}
const renderPassMap = new Map<IRenderPass, IGPURenderPassDescriptor>();

/**
 * 获取渲染通道附件上的纹理描述列表。
 *
 * @param colorAttachments 颜色附件描述。
 * @param depthStencilAttachment 深度模板附件描述。
 *
 * @returns 渲染通道附件上的纹理描述列表。
 */
function getAttachmentTextures(colorAttachments: IRenderPassColorAttachment[], depthStencilAttachment?: IRenderPassDepthStencilAttachment)
{
    const textures: ITexture[] = [];

    for (let i = 0; i < colorAttachments.length; i++)
    {
        const element = colorAttachments[i];
        if (!element) continue;
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

/**
 * 获取渲染通道附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道附件纹理格式。
 */
export function getIRenderPassFormats(renderPass: IRenderPass)
{
    const colorAttachmentTextureFormats = getIRenderPassColorAttachmentFormats(renderPass);

    const depthStencilAttachmentTextureFormat = getIRenderPassDepthStencilAttachmentFormats(renderPass);

    return { colorAttachmentTextureFormats, depthStencilAttachmentTextureFormat };
}

/**
 * 获取渲染通道深度模板附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道深度模板附件纹理格式。
 */
export function getIRenderPassDepthStencilAttachmentFormats(renderPass: IRenderPass)
{
    const gpuRenderPass = getIGPURenderPass(renderPass);

    let depthStencilAttachmentTextureFormat: GPUTextureFormat;
    if (gpuRenderPass.depthStencilAttachment)
    {
        depthStencilAttachmentTextureFormat = internal.getGPUTextureFormat(gpuRenderPass.depthStencilAttachment.view.texture);
    }

    return depthStencilAttachmentTextureFormat;
}

/**
 * 获取渲染通道颜色附件纹理格式。
 *
 * @param renderPass 渲染通道。
 * @returns 渲染通道颜色附件纹理格式。
 */
export function getIRenderPassColorAttachmentFormats(renderPass: IRenderPass)
{
    const gpuRenderPass = getIGPURenderPass(renderPass);

    const colorAttachmentTextureFormats = gpuRenderPass.colorAttachments.map((v) =>
    {
        if (!v) return undefined;

        return internal.getGPUTextureFormat(v.view.texture);
    });

    return colorAttachmentTextureFormats;
}

/**
 * 获取用于解决多重采样的纹理视图。
 *
 * @param texture 接收多重采样结果的纹理。
 * @param multisample 多重采样数量。
 * @returns 用于解决多重采样的纹理视图。
 */
function getMultisampleTextureView(texture: IGPUTexture, multisample: number)
{
    let multisampleTextureView = multisampleTextureMap.get(texture);
    if (!multisampleTextureView)
    {
        // 新增用于解决多重采样的纹理
        const size = getIGPUTextureSize(texture);
        const format = internal.getGPUTextureFormat(texture);
        const multisampleTexture: IGPUTexture = {
            label: '自动生成多重采样的纹理',
            size,
            sampleCount: multisample,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        };
        multisampleTextureView = { texture: multisampleTexture };
        multisampleTextureMap.set(texture, multisampleTextureView);
    }

    return multisampleTextureView;
}

const multisampleTextureMap = new WeakMap<IGPUTexture, IGPUTextureView>();

/**
 * 获取深度模板附件完整描述。
 *
 * @param depthStencilAttachment 深度模板附件描述。
 * @param colorAttachmentSize 颜色附件尺寸。
 * @param multisample 多重采样次数。
 * @returns 深度模板附件完整描述。
 */
function getIGPURenderPassDepthStencilAttachment(depthStencilAttachment: IRenderPassDepthStencilAttachment, attachmentSize: IAttachmentSize, multisample: number)
{
    let gpuDepthStencilAttachment: IGPURenderPassDepthStencilAttachment;
    if (depthStencilAttachment)
    {
        let view = getIGPUTextureView(depthStencilAttachment.view);
        if (!view)
        {
            view = {
                texture: {
                    label: `自动生成的深度纹理`,
                    size: [attachmentSize.width, attachmentSize.height],
                    format: 'depth24plus',
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                }
            };
        }

        let resolveTarget = getIGPUTextureView(depthStencilAttachment.resolveTarget);
        if (multisample && !resolveTarget)
        {
            resolveTarget = view;
            view = getMultisampleTextureView(view.texture, multisample);
        }

        const depthClearValue = depthStencilAttachment.depthClearValue;
        const depthLoadOp = depthStencilAttachment.depthLoadOp;
        const depthStoreOp = depthStencilAttachment.depthStoreOp;

        //
        gpuDepthStencilAttachment = {
            ...depthStencilAttachment,
            view,
            resolveTarget,
            depthClearValue,
            depthLoadOp,
            depthStoreOp,
        };
    }

    return gpuDepthStencilAttachment;
}

/**
 * 获取颜色附件完整描述列表。
 *
 * @param colorAttachments 颜色附件描述列表。
 * @param multisample 多重采样次数。
 * @returns 颜色附件完整描述列表。
 */
function getIGPURenderPassColorAttachments(colorAttachments: IRenderPassColorAttachment[], multisample: number)
{
    const gpuColorAttachments: IGPURenderPassColorAttachment[] = colorAttachments.map((v) =>
    {
        if (!v) return undefined;

        let view = getIGPUTextureView(v.view);
        let resolveTarget = getIGPUTextureView(v.resolveTarget);

        if (multisample && !resolveTarget)
        {
            resolveTarget = view;
            view = getMultisampleTextureView(view.texture, multisample);
        }

        return {
            view,
            resolveTarget,
            clearValue: v.clearValue,
            loadOp: v.loadOp ?? 'clear',
            storeOp: v.storeOp ?? 'store',
        };
    });

    return gpuColorAttachments;
}

/**
 * 更新渲染通道附件尺寸，使得附件上纹理尺寸一致。
 *
 * @param renderPass 渲染通道描述。
 */
function updateAttachmentSize(renderPass: IRenderPass)
{
    const attachmentTextures = getAttachmentTextures(renderPass.colorAttachments, renderPass.depthStencilAttachment);
    if (!renderPass.attachmentSize)
    {
        const textureSize = getIGPUTextureSize(attachmentTextures[0]);
        renderPass.attachmentSize = { width: textureSize[0], height: textureSize[1] };
    }
    attachmentTextures.forEach((v) => setITextureSize(v, renderPass.attachmentSize));
}
