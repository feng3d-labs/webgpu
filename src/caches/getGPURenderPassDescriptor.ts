import { anyEmitter } from "@feng3d/event";
import { CanvasTexture, RenderPassColorAttachment, RenderPassDepthStencilAttachment, RenderPassDescriptor, TextureLike, TextureView } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { IGPUTexture_resize } from "../eventnames";
import { MultisampleTexture } from "../internal/MultisampleTexture";
import { NGPURenderPassColorAttachment } from "../internal/internal";
import { getGPUTextureFormat } from "./getGPUTextureFormat";
import { getGPUTextureView } from "./getGPUTextureView";
import { getIGPUTextureLikeSize } from "./getIGPUTextureSize";

/**
 * 获取GPU渲染通道描述。
 *
 * @param device GPU设备。
 * @param descriptor 渲染通道描述。
 * @returns GPU渲染通道描述。
 */
export function getGPURenderPassDescriptor(device: GPUDevice, descriptor: RenderPassDescriptor): GPURenderPassDescriptor
{
    const renderPassDescriptorMap: Map<RenderPassDescriptor, GPURenderPassDescriptor> = device["_RenderPassDescriptorMap"] = device["_RenderPassDescriptorMap"] || new Map();
    let renderPassDescriptor = renderPassDescriptorMap.get(descriptor);
    if (renderPassDescriptor)
    {
        // 执行更新函数。
        (renderPassDescriptor["_updates"] as Function[]).forEach((v) => v());

        return renderPassDescriptor;
    }

    renderPassDescriptor = { colorAttachments: [] };
    renderPassDescriptorMap.set(descriptor, renderPassDescriptor);

    const _updates: Function[] = renderPassDescriptor["_updates"] = [];

    // 更新渲染通道附件尺寸，使得附件上纹理尺寸一致。
    updateAttachmentSize(descriptor);

    // 获取颜色附件完整描述列表。
    const colorAttachments = getIGPURenderPassColorAttachments(descriptor.colorAttachments, descriptor.sampleCount);

    // 获取深度模板附件
    const depthStencilAttachment = getIGPURenderPassDepthStencilAttachment(descriptor.depthStencilAttachment, descriptor.attachmentSize, descriptor.sampleCount);

    // 附件尺寸变化时，渲染通道描述失效。
    const watchProperty = { attachmentSize: { width: 0, height: 0 } }; // 被监听的属性
    watcher.watchobject(descriptor, watchProperty, () =>
    {
        // 由于深度纹理与多重采样纹理可能是引擎自动生成的，这部分纹理需要更新。
        setIGPURenderPassAttachmentSize(colorAttachments, depthStencilAttachment, descriptor.attachmentSize);
    });

    colorAttachments?.forEach((v, i) =>
    {
        if (!v) return;

        const { clearValue, loadOp, storeOp } = v;

        const attachment: GPURenderPassColorAttachment = {
            ...v,
            view: undefined,
            resolveTarget: undefined,
            clearValue,
            loadOp,
            storeOp,
        };

        const updateView = () =>
        {
            attachment.view = getGPUTextureView(device, v.view);
        };
        updateView();

        //
        if ((v.view.texture as CanvasTexture).context)
        {
            _updates.push(updateView);
        }
        anyEmitter.on(v.view.texture, IGPUTexture_resize, updateView);

        //
        if (v.resolveTarget)
        {
            const updateResolveTarget = () =>
            {
                attachment.resolveTarget = getGPUTextureView(device, v.resolveTarget);
            };
            updateResolveTarget();
            //
            if ((v.resolveTarget?.texture as CanvasTexture)?.context)
            {
                _updates.push(updateResolveTarget);
            }
            anyEmitter.on(v.resolveTarget.texture, IGPUTexture_resize, updateResolveTarget);
        }

        //
        renderPassDescriptor.colorAttachments[i] = attachment;
    });

    if (depthStencilAttachment)
    {
        const v = depthStencilAttachment;

        renderPassDescriptor.depthStencilAttachment = {
            ...v,
            view: undefined,
        };

        const updateView = () =>
        {
            renderPassDescriptor.depthStencilAttachment.view = getGPUTextureView(device, v.view);
        };
        updateView();

        anyEmitter.on(v.view.texture, IGPUTexture_resize, updateView);
    }

    return renderPassDescriptor;
}

/**
 * 获取渲染通道附件上的纹理描述列表。
 *
 * @param colorAttachments 颜色附件描述。
 * @param depthStencilAttachment 深度模板附件描述。
 *
 * @returns 渲染通道附件上的纹理描述列表。
 */
function getAttachmentTextures(colorAttachments: readonly RenderPassColorAttachment[], depthStencilAttachment?: RenderPassDepthStencilAttachment)
{
    const textures: TextureLike[] = [];

    for (let i = 0; i < colorAttachments.length; i++)
    {
        const element = colorAttachments[i];
        if (!element) continue;
        if (element.view)
        {
            textures.push(element.view.texture);
        }
    }

    if (depthStencilAttachment)
    {
        if (depthStencilAttachment.view)
        {
            textures.push(depthStencilAttachment.view.texture);
        }
    }

    return textures;
}

/**
 * 更新渲染通道附件尺寸，使得附件上纹理尺寸一致。
 *
 * @param renderPass 渲染通道描述。
 * @param attachmentSize 附件尺寸。
 */
function setIGPURenderPassAttachmentSize(colorAttachments: NGPURenderPassColorAttachment[], depthStencilAttachment: RenderPassDepthStencilAttachment, attachmentSize: { width: number; height: number; })
{
    const attachmentTextures = getIGPURenderPassAttachmentTextures(colorAttachments, depthStencilAttachment);
    attachmentTextures.forEach((v) => setIGPUTextureSize(v, attachmentSize));
}

/**
 * 设置纹理与附件相同尺寸。
 *
 * @param texture 纹理描述。
 * @param attachmentSize 附件尺寸。
 */
function setIGPUTextureSize(texture: TextureLike, attachmentSize: { width: number, height: number })
{
    if ("context" in texture)
    {
        texture = texture as CanvasTexture;
        const element = document.getElementById(texture.context.canvasId) as HTMLCanvasElement;
        if (element.width !== attachmentSize.width) element.width = attachmentSize.width;
        if (element.height !== attachmentSize.height) element.height = attachmentSize.height;
    }
    else
    {
        if (texture.size?.[2])
        {
            texture.size = [attachmentSize.width, attachmentSize.height, texture.size[2]];
        }
        else
        {
            texture.size = [attachmentSize.width, attachmentSize.height];
        }
    }
}

/**
 * 获取渲染通道附件上的纹理描述列表。
 *
 * @param colorAttachments 颜色附件列表。
 * @param depthStencilAttachment 深度模板附件。
 * @returns 渲染通道附件上的纹理描述列表。
 */
function getIGPURenderPassAttachmentTextures(colorAttachments: NGPURenderPassColorAttachment[], depthStencilAttachment?: RenderPassDepthStencilAttachment)
{
    const textures: TextureLike[] = [];

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
    }

    return textures;
}

/**
 * 获取用于解决多重采样的纹理视图。
 *
 * @param texture 接收多重采样结果的纹理。
 * @param sampleCount 多重采样数量。
 * @returns 用于解决多重采样的纹理视图。
 */
function getMultisampleTextureView(texture: TextureLike, sampleCount: 4)
{
    let multisampleTextureView = multisampleTextureMap.get(texture);
    if (!multisampleTextureView)
    {
        // 新增用于解决多重采样的纹理
        const size = getIGPUTextureLikeSize(texture);
        const format = getGPUTextureFormat(texture);
        const multisampleTexture: MultisampleTexture = {
            label: "自动生成多重采样的纹理",
            size,
            sampleCount,
            format,
        };
        multisampleTextureView = { texture: multisampleTexture };
        multisampleTextureMap.set(texture, multisampleTextureView);
    }

    return multisampleTextureView;
}

const multisampleTextureMap = new WeakMap<TextureLike, TextureView>();

/**
 * 获取深度模板附件完整描述。
 *
 * @param depthStencilAttachment 深度模板附件描述。
 * @param colorAttachmentSize 颜色附件尺寸。
 * @param multisample 多重采样次数。
 * @returns 深度模板附件完整描述。
 */
function getIGPURenderPassDepthStencilAttachment(depthStencilAttachment: RenderPassDepthStencilAttachment, attachmentSize: { width: number, height: number }, multisample: number)
{
    if (!depthStencilAttachment) return undefined;

    let view = depthStencilAttachment.view;
    if (!view)
    {
        view = {
            texture: {
                label: `自动生成的深度纹理`,
                size: [attachmentSize.width, attachmentSize.height],
                format: "depth24plus",
            }
        };
    }

    const depthClearValue = (depthStencilAttachment.depthClearValue !== undefined) ? depthStencilAttachment.depthClearValue : 1;
    const depthLoadOp = depthStencilAttachment.depthLoadOp || "load";
    const depthStoreOp = depthStencilAttachment.depthStoreOp;

    //
    const gpuDepthStencilAttachment: RenderPassDepthStencilAttachment = {
        ...depthStencilAttachment,
        view,
        depthClearValue,
        depthLoadOp,
        depthStoreOp,
    };

    return gpuDepthStencilAttachment;
}

/**
 * 获取颜色附件完整描述列表。
 *
 * @param colorAttachments 颜色附件描述列表。
 * @param sampleCount 多重采样次数。
 * @returns 颜色附件完整描述列表。
 */
function getIGPURenderPassColorAttachments(colorAttachments: readonly RenderPassColorAttachment[], sampleCount: 4)
{
    const gpuColorAttachments: NGPURenderPassColorAttachment[] = colorAttachments.map((v) =>
    {
        if (!v) return undefined;

        let view = v.view;
        let resolveTarget: TextureView;

        if (sampleCount)
        {
            resolveTarget = view;
            view = getMultisampleTextureView(view.texture, sampleCount);
        }

        return {
            view,
            resolveTarget,
            clearValue: v.clearValue,
            loadOp: v.loadOp ?? "clear",
            storeOp: v.storeOp ?? "store",
        };
    });

    return gpuColorAttachments;
}

/**
 * 更新渲染通道附件尺寸，使得附件上纹理尺寸一致。
 *
 * @param renderPass 渲染通道描述。
 */
function updateAttachmentSize(renderPass: RenderPassDescriptor)
{
    const attachmentTextures = getAttachmentTextures(renderPass.colorAttachments, renderPass.depthStencilAttachment);
    if (!renderPass.attachmentSize)
    {
        const textureSize = getIGPUTextureLikeSize(attachmentTextures[0]);
        renderPass.attachmentSize = { width: textureSize[0], height: textureSize[1] };
    }
    attachmentTextures.forEach((v) => setIGPUTextureSize(v, renderPass.attachmentSize));
}

