import { anyEmitter } from '@feng3d/event';
import { computed, Computed, effect, reactive } from '@feng3d/reactivity';
import { CanvasTexture, ChainMap, OcclusionQuery, RenderPass, RenderPassColorAttachment, RenderPassDepthStencilAttachment, RenderPassDescriptor, TextureLike, TextureView } from '@feng3d/render-api';
import { GPUQueue_submit } from '../eventnames';
import { WGPUTimestampQuery } from './GPUPassTimestampWritesManager';
import { WGPURenderPassColorAttachment } from './WGPURenderPassColorAttachment';
import { WGPURenderPassDepthStencilAttachment } from './WGPURenderPassDepthStencilAttachment';

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

            //
            const wGPURenderPassDepthStencilAttachment = WGPURenderPassDepthStencilAttachment.getInstance(device, descriptor.depthStencilAttachment, descriptor);
            reactive(wGPURenderPassDepthStencilAttachment).gpuRenderPassDepthStencilAttachment;

            const depthStencilAttachment = wGPURenderPassDepthStencilAttachment.gpuRenderPassDepthStencilAttachment;

            // 执行
            renderPassDescriptor.label = descriptor.label;
            renderPassDescriptor.maxDrawCount = descriptor.maxDrawCount;
            renderPassDescriptor.colorAttachments = this.getGPURenderPassColorAttachments(device, descriptor);
            renderPassDescriptor.depthStencilAttachment = depthStencilAttachment;

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
