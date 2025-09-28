import { anyEmitter } from '@feng3d/event';
import { computed, Computed, effect, reactive } from '@feng3d/reactivity';
import { CanvasTexture, ChainMap, OcclusionQuery, RenderPass, RenderPassColorAttachment, RenderPassDepthStencilAttachment, RenderPassDescriptor, Texture, TextureLike, TextureView } from '@feng3d/render-api';
import { GPUQueue_submit } from '../eventnames';
import { WGPUTimestampQuery } from './GPUPassTimestampWritesManager';
import { WGPURenderPassColorAttachment } from './WGPURenderPassColorAttachment';
import { WGPUTextureLike } from './WGPUTextureLike';
import { WGPUTextureView } from './WGPUTextureView';

declare global
{
    interface GPUQuerySet
    {
        resolve(commandEncoder: GPUCommandEncoder): void;
    }
}

export class GPURenderPassDescriptorManager
{
    /**
     * 获取GPU渲染通道描述。
     *
     * @param device GPU设备。
     * @param descriptor 渲染通道描述。
     * @returns GPU渲染通道描述。
     */
    static getGPURenderPassDescriptor(device: GPUDevice, renderPass: RenderPass): GPURenderPassDescriptor
    {
        const descriptor: RenderPassDescriptor = renderPass.descriptor;
        // 缓存
        const getGPURenderPassDescriptorKey: GetGPURenderPassDescriptorKey = [device, descriptor];
        let renderPassDescriptor = this.getGPURenderPassDescriptorMap.get(getGPURenderPassDescriptorKey);

        if (renderPassDescriptor) return renderPassDescriptor;

        const r_descriptor = reactive(descriptor);

        // 避免重复创建，触发反应链。
        renderPassDescriptor = {} as any;
        effect(() =>
        {
            // 监听
            r_descriptor.label;
            r_descriptor.maxDrawCount;
            r_descriptor.colorAttachments;
            r_descriptor.depthStencilAttachment;

            // 执行
            renderPassDescriptor.label = descriptor.label;
            renderPassDescriptor.maxDrawCount = descriptor.maxDrawCount;
            renderPassDescriptor.colorAttachments = this.getGPURenderPassColorAttachments(device, descriptor);
            renderPassDescriptor.depthStencilAttachment = this.getGPURenderPassDepthStencilAttachment(device, descriptor);

            this.setOcclusionQuerySet(device, renderPass, renderPassDescriptor);
        });

        effect(() =>
        {
            r_descriptor.timestampQuery;

            const timestampQuery = descriptor.timestampQuery;

            // 处理时间戳查询
            if (timestampQuery)
            {
                renderPassDescriptor.timestampWrites = WGPUTimestampQuery.getGPUPassTimestampWrites(device, timestampQuery);
            }
            else
            {
                delete renderPassDescriptor.timestampWrites;
            }
        });

        this.getGPURenderPassDescriptorMap.set(getGPURenderPassDescriptorKey, renderPassDescriptor);

        return renderPassDescriptor;
    }

    /**
     * 设置纹理尺寸。
     *
     * @param texture 纹理描述。
     * @param attachmentSize 附件尺寸。
     */
    private static setTextureSize(texture: TextureLike, attachmentSize: { width: number, height: number })
    {
        if ('context' in texture)
        {
            texture = texture as CanvasTexture;
            reactive(texture.context).width = attachmentSize.width;
            reactive(texture.context).height = attachmentSize.height;
        }
        else
        {
            const descriptor = texture.descriptor;
            reactive(descriptor.size)[0] = attachmentSize.width;
            reactive(descriptor.size)[1] = attachmentSize.height;
            if (descriptor.size?.[2])
            {
                reactive(descriptor.size)[2] = descriptor.size[2];
            }
        }
    }

    /**
     * 获取深度模板附件完整描述。
     *
     * @param depthStencilAttachment 深度模板附件描述。
     * @param colorAttachmentSize 颜色附件尺寸。
     * @param multisample 多重采样次数。
     * @returns 深度模板附件完整描述。
     */
    private static getGPURenderPassDepthStencilAttachment(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        const depthStencilAttachment = descriptor.depthStencilAttachment;

        if (!depthStencilAttachment) return undefined;

        // 初始化附件尺寸。
        if (!descriptor.attachmentSize)
        {
            const gpuTextureLike = WGPUTextureLike.getInstance(device, depthStencilAttachment.view.texture);
            const gpuTexture = gpuTextureLike.gpuTexture;

            reactive(descriptor).attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
        }
        const attachmentSize = descriptor.attachmentSize;

        // 缓存
        const getGPURenderPassDepthStencilAttachmentKey: GetGPURenderPassDepthStencilAttachmentKey = [device, depthStencilAttachment];
        let result = this.getGPURenderPassDepthStencilAttachmentMap.get(getGPURenderPassDepthStencilAttachmentKey);

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
                    descriptor: {
                        label: `自动生成的深度纹理`,
                        size: [attachmentSize.width, attachmentSize.height],
                        format: 'depth24plus',
                    },
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
                this.setTextureSize(view.texture, descriptor.attachmentSize);

                // 更改纹理尺寸将会销毁重新创建纹理，需要重新获取view。
                gpuDepthStencilAttachment.view = WGPUTextureView.getInstance(device, view).textureView;
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
        this.getGPURenderPassDepthStencilAttachmentMap.set(getGPURenderPassDepthStencilAttachmentKey, result);

        return result.value;
    }

    /**
     * 获取颜色附件完整描述列表。
     *
     * @param colorAttachments 颜色附件描述列表。
     * @param sampleCount 多重采样次数。
     * @returns 颜色附件完整描述列表。
     */
    private static getGPURenderPassColorAttachments(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        const getGPURenderPassColorAttachmentsKey: GetGPURenderPassColorAttachmentsKey = [device, descriptor];
        let result = this.getIGPURenderPassColorAttachmentsMap.get(getGPURenderPassColorAttachmentsKey);

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

                const wGPURenderPassColorAttachment = WGPURenderPassColorAttachment.getInstance(device, v, descriptor);

                const attachment = wGPURenderPassColorAttachment.gpuRenderPassColorAttachment;

                gpuColorAttachments.push(attachment);
            });

            return gpuColorAttachments;
        });
        this.getIGPURenderPassColorAttachmentsMap.set(getGPURenderPassColorAttachmentsKey, result);

        return result.value;
    }

    private static setOcclusionQuerySet(device: GPUDevice, renderPass: RenderPass, renderPassDescriptor: GPURenderPassDescriptor)
    {
        const occlusionQuerys = renderPass.renderPassObjects?.filter((v) => v.__type__ === 'OcclusionQuery') as OcclusionQuery[];

        if (!occlusionQuerys || occlusionQuerys.length === 0) return;
        renderPassDescriptor.occlusionQuerySet = device.createQuerySet({ type: 'occlusion', count: occlusionQuerys.length });
        const resolveBuf = device.createBuffer({
            label: 'resolveBuffer',
            // Query results are 64bit unsigned integers.
            size: occlusionQuerys.length * BigUint64Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });
        const resultBuf = device.createBuffer({
            label: 'resultBuffer',
            size: resolveBuf.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        //
        renderPassDescriptor.occlusionQuerySet.resolve = (commandEncoder: GPUCommandEncoder) =>
        {
            if (occlusionQuerys.length === 0) return;

            commandEncoder.resolveQuerySet(renderPassDescriptor.occlusionQuerySet, 0, occlusionQuerys.length, resolveBuf, 0);

            if (resultBuf.mapState === 'unmapped')
            {
                commandEncoder.copyBufferToBuffer(resolveBuf, 0, resultBuf, 0, resultBuf.size);
            }

            const getOcclusionQueryResult = () =>
            {
                if (resultBuf.mapState === 'unmapped')
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

    private static readonly getGPURenderPassDescriptorMap = new ChainMap<GetGPURenderPassDescriptorKey, GPURenderPassDescriptor>();
    private static readonly getMultisampleTextureViewMap = new WeakMap<TextureLike, TextureView>();
    private static readonly getGPURenderPassDepthStencilAttachmentMap = new ChainMap<GetGPURenderPassDepthStencilAttachmentKey, Computed<GPURenderPassDepthStencilAttachment>>();
    private static readonly getIGPURenderPassColorAttachmentsMap = new ChainMap<GetGPURenderPassColorAttachmentsKey, Computed<GPURenderPassColorAttachment[]>>();
    private static readonly getGPURenderPassColorAttachmentMap = new ChainMap<GetGPURenderPassColorAttachmentKey, GPURenderPassColorAttachment>();
}

type GetGPURenderPassDescriptorKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
type GetGPURenderPassDepthStencilAttachmentKey = [device: GPUDevice, depthStencilAttachment: RenderPassDepthStencilAttachment];
type GetGPURenderPassColorAttachmentsKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
type GetGPURenderPassColorAttachmentKey = [device: GPUDevice, renderPassColorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor];
