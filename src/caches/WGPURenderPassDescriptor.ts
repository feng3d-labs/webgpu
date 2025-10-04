import { computed, Computed, effect, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderPass, RenderPassDescriptor } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
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

export class WGPURenderPassDescriptor extends ReactiveObject
{
    readonly gpuRenderPassDescriptor: GPURenderPassDescriptor;

    constructor(device: GPUDevice, renderPass: RenderPass)
    {
        super();

        this._onCreate(device, renderPass)
        this._onMap(device, renderPass);
    }

    private _onCreate(device: GPUDevice, renderPass: RenderPass)
    {
        const r_this = reactive(this);
        const r_renderPass = reactive(renderPass);

        effect(() =>
        {
            r_renderPass.descriptor;

            const descriptor: RenderPassDescriptor = renderPass.descriptor;
            const r_descriptor = reactive(descriptor);

            // 监听
            r_descriptor.label;
            r_descriptor.maxDrawCount;
            r_descriptor.colorAttachments;
            r_descriptor.depthStencilAttachment;
            r_descriptor.timestampQuery;

            //
            const label = descriptor.label;
            const maxDrawCount = descriptor.maxDrawCount;

            //
            const colorAttachments = WGPURenderPassDescriptor.getGPURenderPassColorAttachments(device, descriptor);

            //
            const wGPURenderPassDepthStencilAttachment = WGPURenderPassDepthStencilAttachment.getInstance(device, descriptor);
            reactive(wGPURenderPassDepthStencilAttachment).gpuRenderPassDepthStencilAttachment;
            const depthStencilAttachment = wGPURenderPassDepthStencilAttachment.gpuRenderPassDepthStencilAttachment;

            //
            const wgpuQuerySet = WGPUQuerySet.getInstance(device, renderPass);
            reactive(wgpuQuerySet).gpuQuerySet;
            const occlusionQuerySet = wgpuQuerySet.gpuQuerySet;

            //
            const timestampQuery = descriptor.timestampQuery;
            const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(device, timestampQuery);
            reactive(wGPUTimestampQuery).gpuPassTimestampWrites;
            const timestampWrites = wGPUTimestampQuery.gpuPassTimestampWrites;

            //
            r_this.gpuRenderPassDescriptor = {
                label: label,
                maxDrawCount: maxDrawCount,
                colorAttachments: colorAttachments,
                depthStencilAttachment: depthStencilAttachment,
                occlusionQuerySet: occlusionQuerySet,
                timestampWrites: timestampWrites,
            };
        });

        this.destroyCall(() => { r_this.gpuRenderPassDescriptor = null; });
    }

    private _onMap(device: GPUDevice, renderPass: RenderPass)
    {
        device.renderPassDescriptors ??= new WeakMap();
        device.renderPassDescriptors.set(renderPass, this);
        this.destroyCall(() => { device.renderPassDescriptors.delete(renderPass); });
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

    private static readonly getIGPURenderPassColorAttachmentsMap = new ChainMap<GetGPURenderPassColorAttachmentsKey, Computed<GPURenderPassColorAttachment[]>>();

    static getInstance(device: GPUDevice, renderPass: RenderPass)
    {
        return device.renderPassDescriptors?.get(renderPass) || new WGPURenderPassDescriptor(device, renderPass);
    }
}

declare global
{
    interface GPUDevice
    {
        renderPassDescriptors: WeakMap<RenderPass, WGPURenderPassDescriptor>;
    }
}

type GetGPURenderPassDescriptorKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
type GetGPURenderPassColorAttachmentsKey = [device: GPUDevice, descriptor: RenderPassDescriptor];
