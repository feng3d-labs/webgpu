import { effect, reactive } from '@feng3d/reactivity';
import { RenderPass, RenderPassDescriptor } from '@feng3d/render-api';
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
            r_descriptor.colorAttachments?.concat();

            //
            const label = descriptor.label;

            //
            const gpuColorAttachments: GPURenderPassColorAttachment[] = descriptor.colorAttachments.reduce((pre, v) =>
            {
                if (!v) return pre;

                const wgpuRenderPassColorAttachment = WGPURenderPassColorAttachment.getInstance(device, v, descriptor);
                reactive(wgpuRenderPassColorAttachment).gpuRenderPassColorAttachment;
                const attachment = wgpuRenderPassColorAttachment.gpuRenderPassColorAttachment;

                pre.push(attachment);

                return pre;
            }, [])

            //
            const gpuRenderPassDescriptor: GPURenderPassDescriptor = {
                label: label,
                colorAttachments: gpuColorAttachments,
            };

            //
            const wgpuQuerySet = WGPUQuerySet.getInstance(device, renderPass);
            reactive(wgpuQuerySet).gpuQuerySet;
            if (wgpuQuerySet.gpuQuerySet)
            {
                gpuRenderPassDescriptor.occlusionQuerySet = wgpuQuerySet.gpuQuerySet;
            }

            r_descriptor.timestampQuery;
            if (descriptor.timestampQuery)
            {
                const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(device, descriptor.timestampQuery);
                wGPUTimestampQuery && reactive(wGPUTimestampQuery).gpuPassTimestampWrites;
                gpuRenderPassDescriptor.timestampWrites = wGPUTimestampQuery?.gpuPassTimestampWrites;
            }

            //
            r_descriptor.depthStencilAttachment;
            if (descriptor.depthStencilAttachment)
            {
                //
                const wGPURenderPassDepthStencilAttachment = WGPURenderPassDepthStencilAttachment.getInstance(device, descriptor);
                reactive(wGPURenderPassDepthStencilAttachment).gpuRenderPassDepthStencilAttachment;
                gpuRenderPassDescriptor.depthStencilAttachment = wGPURenderPassDepthStencilAttachment.gpuRenderPassDepthStencilAttachment;
            }

            //
            r_descriptor.maxDrawCount;
            if (r_descriptor.maxDrawCount !== undefined)
            {
                gpuRenderPassDescriptor.maxDrawCount = descriptor.maxDrawCount;
            }

            //
            r_this.gpuRenderPassDescriptor = gpuRenderPassDescriptor;
        });

        this.destroyCall(() => { r_this.gpuRenderPassDescriptor = null; });
    }

    private _onMap(device: GPUDevice, renderPass: RenderPass)
    {
        device.renderPassDescriptors ??= new WeakMap();
        device.renderPassDescriptors.set(renderPass, this);
        this.destroyCall(() => { device.renderPassDescriptors.delete(renderPass); });
    }

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
