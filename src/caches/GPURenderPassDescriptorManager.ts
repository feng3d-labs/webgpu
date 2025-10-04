import { computed, Computed, effect, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderPass, RenderPassDescriptor } from '@feng3d/render-api';
import { WGPUQuerySet } from './WGPUQuerySet';
import { WGPURenderPassColorAttachment } from './WGPURenderPassColorAttachment';
import { WGPURenderPassDepthStencilAttachment } from './WGPURenderPassDepthStencilAttachment';
import { WGPUTimestampQuery } from './WGPUTimestampQuery';

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

            const wgpuQuerySet = WGPUQuerySet.getInstance(device, renderPass);
            reactive(wgpuQuerySet).gpuQuerySet;

            renderPassDescriptor.occlusionQuerySet = wgpuQuerySet.gpuQuerySet;
        });

        effect(() =>
        {
            r_descriptor.timestampQuery;

            const timestampQuery = descriptor.timestampQuery;

            const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(device, timestampQuery);

            if (wGPUTimestampQuery)
            {
                reactive(wGPUTimestampQuery).gpuPassTimestampWrites;
                const timestampWrites = wGPUTimestampQuery.gpuPassTimestampWrites;

                renderPassDescriptor.timestampWrites = timestampWrites;
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

    private static readonly getGPURenderPassDescriptorMap = new ChainMap<GetGPURenderPassDescriptorKey, GPURenderPassDescriptor>();
    private static readonly getIGPURenderPassColorAttachmentsMap = new ChainMap<GetGPURenderPassColorAttachmentsKey, Computed<GPURenderPassColorAttachment[]>>();
}

type GetGPURenderPassDescriptorKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
type GetGPURenderPassColorAttachmentsKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
