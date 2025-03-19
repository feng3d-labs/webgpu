import { CanvasTexture, ChainMap, computed, ComputedRef, reactive, RenderPassColorAttachment, RenderPassDepthStencilAttachment, RenderPassDescriptor, TextureLike, TextureView } from "@feng3d/render-api";
import { MultisampleTexture } from "../internal/MultisampleTexture";
import { NGPURenderPassColorAttachment } from "../internal/internal";
import { getGPUTextureFormat } from "./getGPUTextureFormat";
import { getGPUTextureView } from "./getGPUTextureView";
import { getTextureSize } from "./getTextureSize";

/**
 * 获取GPU渲染通道描述。
 *
 * @param device GPU设备。
 * @param descriptor 渲染通道描述。
 * @returns GPU渲染通道描述。
 */
export function getGPURenderPassDescriptor(device: GPUDevice, descriptor: RenderPassDescriptor): GPURenderPassDescriptor
{
    const getGPURenderPassDescriptorKey: GetGPURenderPassDescriptorKey = [device, descriptor];
    let result = getGPURenderPassDescriptorMap.get(getGPURenderPassDescriptorKey);
    if (result) return result.value;

    const renderPassDescriptor: GPURenderPassDescriptor = {} as any;

    result = computed(() =>
    {
        // // 更新渲染通道附件尺寸，使得附件上纹理尺寸一致。
        // updateAttachmentSize(descriptor);

        // 获取颜色附件完整描述列表。
        renderPassDescriptor.colorAttachments = getIGPURenderPassColorAttachments(device, descriptor);

        // 获取深度模板附件
        const depthStencilAttachment = getIGPURenderPassDepthStencilAttachment(descriptor.depthStencilAttachment, descriptor.attachmentSize, descriptor.sampleCount);

        // // 更新尺寸
        // computed(() =>
        // {
        //     // 监听
        //     const r_descriptor = reactive(descriptor);
        //     r_descriptor.attachmentSize.width;
        //     r_descriptor.attachmentSize.height;

        //     // 执行
        //     setIGPURenderPassAttachmentSize(colorAttachments, depthStencilAttachment, descriptor.attachmentSize);
        // }).value;

        if (depthStencilAttachment)
        {
            const v = depthStencilAttachment;

            renderPassDescriptor.depthStencilAttachment = {
                ...v,
                view: getGPUTextureView(device, v.view),
            };
        }

        return renderPassDescriptor;
    });
    getGPURenderPassDescriptorMap.set(getGPURenderPassDescriptorKey, result);

    return result.value;
}

type GetGPURenderPassDescriptorKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
const getGPURenderPassDescriptorMap = new ChainMap<GetGPURenderPassDescriptorKey, ComputedRef<GPURenderPassDescriptor>>;

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
    attachmentTextures.forEach((v) => setTextureSize(v, attachmentSize));
}

/**
 * 设置纹理与附件相同尺寸。
 *
 * @param texture 纹理描述。
 * @param attachmentSize 附件尺寸。
 */
function setTextureSize(texture: TextureLike, attachmentSize: { width: number, height: number })
{
    if ("context" in texture)
    {
        texture = texture as CanvasTexture;
        const element = typeof texture.context.canvasId === "string" ? document.getElementById(texture.context.canvasId) as HTMLCanvasElement : texture.context.canvasId;
        if (element.width !== attachmentSize.width) element.width = attachmentSize.width;
        if (element.height !== attachmentSize.height) element.height = attachmentSize.height;
    }
    else
    {
        if (texture.size?.[2])
        {
            reactive(texture).size = [attachmentSize.width, attachmentSize.height, texture.size[2]];
        }
        else
        {
            reactive(texture).size = [attachmentSize.width, attachmentSize.height];
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
    let multisampleTextureView: TextureView = texture["_multisampleTextureView"];
    if (multisampleTextureView) return multisampleTextureView;

    // 新增用于解决多重采样的纹理
    const size = getTextureSize(texture);
    const format = getGPUTextureFormat(texture);
    const multisampleTexture: MultisampleTexture = {
        label: "自动生成多重采样的纹理",
        size,
        sampleCount,
        format,
    };
    multisampleTextureView = texture["_multisampleTextureView"] = { texture: multisampleTexture };

    return multisampleTextureView;
}

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
function getIGPURenderPassColorAttachments(device: GPUDevice, descriptor: RenderPassDescriptor)
{
    const getIGPURenderPassColorAttachmentsKey: GetIGPURenderPassColorAttachmentsKey = [device, descriptor];
    let result = getIGPURenderPassColorAttachmentsMap.get(getIGPURenderPassColorAttachmentsKey);
    if (result) return result.value;

    const gpuColorAttachments: GPURenderPassColorAttachment[] = [];
    result = computed(() =>
    {
        // 监听
        const r_descriptor = reactive(descriptor);
        r_descriptor.colorAttachments.forEach((v) => v);

        // 执行
        const { colorAttachments } = descriptor;
        gpuColorAttachments.length = 0;
        colorAttachments.forEach((v) =>
        {
            if (!v) return;

            const attachment = getGPURenderPassColorAttachment(device, v, descriptor);

            gpuColorAttachments.push(attachment);
        });

        return gpuColorAttachments;
    });
    getIGPURenderPassColorAttachmentsMap.set(getIGPURenderPassColorAttachmentsKey, result);

    return result.value;
}
type GetIGPURenderPassColorAttachmentsKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
const getIGPURenderPassColorAttachmentsMap = new ChainMap<GetIGPURenderPassColorAttachmentsKey, ComputedRef<GPURenderPassColorAttachment[]>>;

/**
 * 获取颜色附件完整描述。
 */
function getGPURenderPassColorAttachment(device: GPUDevice, renderPassColorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
{
    const getGPURenderPassColorAttachmentKey: GetGPURenderPassColorAttachmentKey = [device, renderPassColorAttachment, descriptor];
    let result = getGPURenderPassColorAttachmentMap.get(getGPURenderPassColorAttachmentKey);
    if (result) return result.value;

    const attachment: GPURenderPassColorAttachment = {} as any;
    result = computed(() =>
    {
        // 监听
        const r_renderPassColorAttachment = reactive(renderPassColorAttachment);
        r_renderPassColorAttachment.view;
        r_renderPassColorAttachment.depthSlice;
        r_renderPassColorAttachment.clearValue;
        r_renderPassColorAttachment.loadOp;
        r_renderPassColorAttachment.storeOp;

        //
        const { depthSlice, clearValue, loadOp, storeOp } = renderPassColorAttachment;
        let view = renderPassColorAttachment.view;

        // 初始化附件尺寸。
        if (!descriptor.attachmentSize)
        {
            const textureSize = getTextureSize(view.texture);
            reactive(descriptor).attachmentSize = { width: textureSize[0], height: textureSize[1] };
        }

        const { sampleCount } = descriptor;
        let resolveTarget: TextureView;
        if (sampleCount)
        {
            resolveTarget = view;
            view = getMultisampleTextureView(view.texture, sampleCount);
        }

        // 更新纹理尺寸
        computed(() =>
        {
            // 监听
            const r_descriptor = reactive(descriptor);
            r_descriptor.attachmentSize.width;
            r_descriptor.attachmentSize.height;

            // 执行
            setTextureSize(view.texture, descriptor.attachmentSize);
            resolveTarget && setTextureSize(resolveTarget.texture, descriptor.attachmentSize);

            // 更改纹理尺寸将会销毁重新创建纹理，需要重新获取view。
            attachment.view = getGPUTextureView(device, view);
            attachment.resolveTarget = getGPUTextureView(device, resolveTarget);
        }).value;

        //
        attachment.depthSlice = depthSlice;
        attachment.clearValue = clearValue;
        attachment.loadOp = loadOp ?? "clear";
        attachment.storeOp = storeOp ?? "store";

        return attachment;
    });
    getGPURenderPassColorAttachmentMap.set(getGPURenderPassColorAttachmentKey, result);

    return result.value;
}
type GetGPURenderPassColorAttachmentKey = [device: GPUDevice, renderPassColorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor];
const getGPURenderPassColorAttachmentMap = new ChainMap<GetGPURenderPassColorAttachmentKey, ComputedRef<GPURenderPassColorAttachment>>;

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
        const textureSize = getTextureSize(attachmentTextures[0]);
        reactive(renderPass).attachmentSize = { width: textureSize[0], height: textureSize[1] };
    }
    attachmentTextures.forEach((v) => setTextureSize(v, renderPass.attachmentSize));
}

