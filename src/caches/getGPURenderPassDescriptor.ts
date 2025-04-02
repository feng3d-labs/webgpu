import { anyEmitter } from "@feng3d/event";
import { CanvasTexture, ChainMap, computed, Computed, effect, OcclusionQuery, reactive, RenderPass, RenderPassColorAttachment, RenderPassDepthStencilAttachment, RenderPassDescriptor, Texture, TextureLike, TextureView } from "@feng3d/render-api";
import { GPUQueue_submit } from "../eventnames";
import { MultisampleTexture } from "../internal/MultisampleTexture";
import { getGPUPassTimestampWrites } from "./getGPUPassTimestampWrites";
import { getGPUTextureFormat } from "./getGPUTextureFormat";
import { getGPUTextureView } from "./getGPUTextureView";
import { getTextureSize } from "./getTextureSize";

declare global
{
    interface GPUQuerySet
    {
        resolve(commandEncoder: GPUCommandEncoder): void;
    }
}

/**
 * 获取GPU渲染通道描述。
 *
 * @param device GPU设备。
 * @param descriptor 渲染通道描述。
 * @returns GPU渲染通道描述。
 */
export function getGPURenderPassDescriptor(device: GPUDevice, renderPass: RenderPass): GPURenderPassDescriptor
{
    const descriptor: RenderPassDescriptor = renderPass.descriptor;
    // 缓存
    const getGPURenderPassDescriptorKey: GetGPURenderPassDescriptorKey = [device, descriptor];
    let renderPassDescriptor = getGPURenderPassDescriptorMap.get(getGPURenderPassDescriptorKey);
    if (renderPassDescriptor) return renderPassDescriptor;

    // 避免重复创建，触发反应链。
    renderPassDescriptor = {} as any;
    effect(() =>
    {
        // 监听
        const r_descriptor = reactive(descriptor);
        r_descriptor.label;
        r_descriptor.maxDrawCount;
        r_descriptor.colorAttachments;
        r_descriptor.depthStencilAttachment;

        // 执行
        renderPassDescriptor.label = descriptor.label;
        renderPassDescriptor.maxDrawCount = descriptor.maxDrawCount;
        renderPassDescriptor.colorAttachments = getGPURenderPassColorAttachments(device, descriptor);
        renderPassDescriptor.depthStencilAttachment = getGPURenderPassDepthStencilAttachment(device, descriptor);

        // 处理时间戳查询
        renderPassDescriptor.timestampWrites = getGPUPassTimestampWrites(device, descriptor.timestampQuery);

        setOcclusionQuerySet(device, renderPass, renderPassDescriptor);
    });

    getGPURenderPassDescriptorMap.set(getGPURenderPassDescriptorKey, renderPassDescriptor);

    return renderPassDescriptor;
}

type GetGPURenderPassDescriptorKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
const getGPURenderPassDescriptorMap = new ChainMap<GetGPURenderPassDescriptorKey, GPURenderPassDescriptor>;

/**
 * 设置纹理尺寸。
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
        reactive(texture)._canvasSizeVersion = ~~texture._canvasSizeVersion + 1;
    }
    else
    {
        reactive(texture.size)[0] = attachmentSize.width;
        reactive(texture.size)[1] = attachmentSize.height;
        if (texture.size?.[2])
        {
            reactive(texture.size)[2] = texture.size[2];
        }
    }
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
    if (sampleCount !== 4) return undefined;
    if (!texture) return undefined;

    let multisampleTextureView = getMultisampleTextureViewMap.get(texture);
    if (multisampleTextureView) return multisampleTextureView;

    // 新增用于解决多重采样的纹理
    const multisampleTexture: MultisampleTexture = { label: "自动生成多重采样的纹理", sampleCount } as MultisampleTexture;
    multisampleTextureView = { texture: multisampleTexture };
    effect(() =>
    {
        // 新建的多重采样纹理尺寸与格式与原始纹理同步。
        reactive(multisampleTexture).size = getTextureSize(texture);
        reactive(multisampleTexture).format = getGPUTextureFormat(texture);
    });

    getMultisampleTextureViewMap.set(texture, multisampleTextureView);
    return multisampleTextureView;
}
const getMultisampleTextureViewMap = new WeakMap<TextureLike, TextureView>;

/**
 * 获取深度模板附件完整描述。
 *
 * @param depthStencilAttachment 深度模板附件描述。
 * @param colorAttachmentSize 颜色附件尺寸。
 * @param multisample 多重采样次数。
 * @returns 深度模板附件完整描述。
 */
function getGPURenderPassDepthStencilAttachment(device: GPUDevice, descriptor: RenderPassDescriptor)
{
    const depthStencilAttachment = descriptor.depthStencilAttachment;
    if (!depthStencilAttachment) return undefined;

    // 初始化附件尺寸。
    if (!descriptor.attachmentSize)
    {
        const textureSize = getTextureSize(depthStencilAttachment.view.texture);
        reactive(descriptor).attachmentSize = { width: textureSize[0], height: textureSize[1] };
    }
    const attachmentSize = descriptor.attachmentSize;

    // 缓存
    const getGPURenderPassDepthStencilAttachmentKey: GetGPURenderPassDepthStencilAttachmentKey = [device, depthStencilAttachment];
    let result = getGPURenderPassDepthStencilAttachmentMap.get(getGPURenderPassDepthStencilAttachmentKey);
    if (result) return result.value;

    //
    let atuoCreateDepthTexture: Texture;
    let atuoCreateDepthTextureView: TextureView;

    // 避免重复创建，触发反应链。
    const gpuDepthStencilAttachment: GPURenderPassDepthStencilAttachment = {} as any;
    result = computed(() =>
    {
        // 监听
        const r_depthStencilAttachment = reactive(depthStencilAttachment);
        r_depthStencilAttachment.depthClearValue;
        r_depthStencilAttachment.depthLoadOp;
        r_depthStencilAttachment.depthStoreOp;
        r_depthStencilAttachment.depthReadOnly;
        r_depthStencilAttachment.stencilClearValue;
        r_depthStencilAttachment.stencilLoadOp;
        r_depthStencilAttachment.stencilStoreOp;
        r_depthStencilAttachment.stencilReadOnly;
        r_depthStencilAttachment.view;

        // 执行
        const { depthClearValue, depthLoadOp, depthStoreOp, depthReadOnly, stencilClearValue, stencilLoadOp, stencilStoreOp, stencilReadOnly } = depthStencilAttachment;
        let view = depthStencilAttachment.view;
        if (!view)
        {
            atuoCreateDepthTexture ??= {
                label: `自动生成的深度纹理`,
                size: [attachmentSize.width, attachmentSize.height],
                format: "depth24plus",
            };
            atuoCreateDepthTextureView ??= { texture: atuoCreateDepthTexture };
            //
            view = atuoCreateDepthTextureView;
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

            // 更改纹理尺寸将会销毁重新创建纹理，需要重新获取view。
            gpuDepthStencilAttachment.view = getGPUTextureView(device, view);
        }).value;

        //
        gpuDepthStencilAttachment.depthClearValue = depthClearValue ?? 1;
        gpuDepthStencilAttachment.depthLoadOp = depthLoadOp;
        gpuDepthStencilAttachment.depthStoreOp = depthStoreOp;
        gpuDepthStencilAttachment.depthReadOnly = depthReadOnly;
        gpuDepthStencilAttachment.stencilClearValue = stencilClearValue ?? 0;
        gpuDepthStencilAttachment.stencilLoadOp = stencilLoadOp;
        gpuDepthStencilAttachment.stencilStoreOp = stencilStoreOp;
        gpuDepthStencilAttachment.stencilReadOnly = stencilReadOnly;

        return gpuDepthStencilAttachment;
    });
    getGPURenderPassDepthStencilAttachmentMap.set(getGPURenderPassDepthStencilAttachmentKey, result);

    return result.value;
}
type GetGPURenderPassDepthStencilAttachmentKey = [device: GPUDevice, depthStencilAttachment: RenderPassDepthStencilAttachment];
const getGPURenderPassDepthStencilAttachmentMap = new ChainMap<GetGPURenderPassDepthStencilAttachmentKey, Computed<GPURenderPassDepthStencilAttachment>>;

/**
 * 获取颜色附件完整描述列表。
 *
 * @param colorAttachments 颜色附件描述列表。
 * @param sampleCount 多重采样次数。
 * @returns 颜色附件完整描述列表。
 */
function getGPURenderPassColorAttachments(device: GPUDevice, descriptor: RenderPassDescriptor)
{
    const getGPURenderPassColorAttachmentsKey: GetGPURenderPassColorAttachmentsKey = [device, descriptor];
    let result = getIGPURenderPassColorAttachmentsMap.get(getGPURenderPassColorAttachmentsKey);
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
    getIGPURenderPassColorAttachmentsMap.set(getGPURenderPassColorAttachmentsKey, result);

    return result.value;
}
type GetGPURenderPassColorAttachmentsKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
const getIGPURenderPassColorAttachmentsMap = new ChainMap<GetGPURenderPassColorAttachmentsKey, Computed<GPURenderPassColorAttachment[]>>;

/**
 * 获取颜色附件完整描述。
 */
function getGPURenderPassColorAttachment(device: GPUDevice, renderPassColorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
{
    const getGPURenderPassColorAttachmentKey: GetGPURenderPassColorAttachmentKey = [device, renderPassColorAttachment, descriptor];
    let attachment = getGPURenderPassColorAttachmentMap.get(getGPURenderPassColorAttachmentKey);
    if (attachment) return attachment;

    // 初始化附件尺寸。
    if (!descriptor.attachmentSize)
    {
        const textureSize = getTextureSize(renderPassColorAttachment.view.texture);
        reactive(descriptor).attachmentSize = { width: textureSize[0], height: textureSize[1] };
    }

    attachment = {} as any;
    effect(() =>
    {
        // 监听
        const r_renderPassColorAttachment = reactive(renderPassColorAttachment);
        r_renderPassColorAttachment.view;
        r_renderPassColorAttachment.depthSlice;
        r_renderPassColorAttachment.clearValue;
        r_renderPassColorAttachment.loadOp;
        r_renderPassColorAttachment.storeOp;
        const r_descriptor = reactive(descriptor);
        r_descriptor.sampleCount;

        //
        let view = renderPassColorAttachment.view;
        const { depthSlice, clearValue, loadOp, storeOp } = renderPassColorAttachment;

        const { sampleCount } = descriptor;
        let resolveTarget: TextureView;
        if (sampleCount)
        {
            resolveTarget = view;
            view = getMultisampleTextureView(view.texture, sampleCount);
        }

        // 更新纹理尺寸
        effect(() =>
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
        });

        //
        attachment.depthSlice = depthSlice;
        attachment.clearValue = clearValue;
        attachment.loadOp = loadOp ?? "clear";
        attachment.storeOp = storeOp ?? "store";
    });

    getGPURenderPassColorAttachmentMap.set(getGPURenderPassColorAttachmentKey, attachment);

    return attachment;
}
type GetGPURenderPassColorAttachmentKey = [device: GPUDevice, renderPassColorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor];
const getGPURenderPassColorAttachmentMap = new ChainMap<GetGPURenderPassColorAttachmentKey, GPURenderPassColorAttachment>;

function setOcclusionQuerySet(device: GPUDevice, renderPass: RenderPass, renderPassDescriptor: GPURenderPassDescriptor)
{
    const occlusionQuerys = renderPass.renderPassObjects?.filter((v) => v.__type__ === "OcclusionQuery") as OcclusionQuery[];
    if (!occlusionQuerys || occlusionQuerys.length === 0) return;
    renderPassDescriptor.occlusionQuerySet = device.createQuerySet({ type: "occlusion", count: occlusionQuerys.length });
    const resolveBuf = device.createBuffer({
        label: "resolveBuffer",
        // Query results are 64bit unsigned integers.
        size: occlusionQuerys.length * BigUint64Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });
    const resultBuf = device.createBuffer({
        label: "resultBuffer",
        size: resolveBuf.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    //
    renderPassDescriptor.occlusionQuerySet.resolve = (commandEncoder: GPUCommandEncoder) =>
    {
        if (occlusionQuerys.length === 0) return;

        commandEncoder.resolveQuerySet(renderPassDescriptor.occlusionQuerySet, 0, occlusionQuerys.length, resolveBuf, 0);

        if (resultBuf.mapState === "unmapped")
        {
            commandEncoder.copyBufferToBuffer(resolveBuf, 0, resultBuf, 0, resultBuf.size);
        }

        const getOcclusionQueryResult = () =>
        {
            if (resultBuf.mapState === "unmapped")
            {
                resultBuf.mapAsync(GPUMapMode.READ).then(() =>
                {
                    const bigUint64Array = new BigUint64Array(resultBuf.getMappedRange());

                    const results = bigUint64Array.reduce((pv: number[], cv) =>
                    {
                        pv.push(Number(cv));
                        return pv;
                    }, []);
                    resultBuf.unmap();

                    occlusionQuerys.forEach((v, i) =>
                    {
                        v.onQuery?.(results[i]);
                    });

                    renderPass.onOcclusionQuery?.(occlusionQuerys, results);

                    //
                    anyEmitter.off(device.queue, GPUQueue_submit, getOcclusionQueryResult);
                });
            }
        };

        // 监听提交WebGPU事件
        anyEmitter.on(device.queue, GPUQueue_submit, getOcclusionQueryResult);
    };
}
