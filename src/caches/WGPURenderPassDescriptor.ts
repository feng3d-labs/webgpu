import { reactive } from '@feng3d/reactivity';
import { RenderPass, RenderPassDescriptor } from '@feng3d/render-api';
import { RenderPassFormat } from '../internal/RenderPassFormat';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUQuerySet } from './WGPUQuerySet';
import { WGPURenderPassColorAttachment } from './WGPURenderPassColorAttachment';
import { WGPURenderPassDepthStencilAttachment } from './WGPURenderPassDepthStencilAttachment';
import { WGPUTextureLike } from './WGPUTextureLike';
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
    readonly renderPassFormat: RenderPassFormat;

    constructor(device: GPUDevice, renderPass: RenderPass)
    {
        super();

        this._onCreate(device, renderPass)
        this._onMap(device, renderPass);
    }

    private _onCreate(device: GPUDevice, renderPass: RenderPass)
    {
        this._initAttachmentSize(device, renderPass);

        const r_this = reactive(this);
        const r_renderPass = reactive(renderPass);

        this.effect(() =>
        {
            r_renderPass.descriptor;

            const descriptor: RenderPassDescriptor = renderPass.descriptor;
            const r_descriptor = reactive(descriptor);

            //
            const label = r_descriptor.label;

            //
            r_descriptor.colorAttachments?.concat();
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

            // 计算深度模板附件的纹理格式
            let depthStencilFormat: GPUTextureFormat;
            //
            const wGPURenderPassDepthStencilAttachment = WGPURenderPassDepthStencilAttachment.getInstance(device, descriptor);
            reactive(wGPURenderPassDepthStencilAttachment).gpuRenderPassDepthStencilAttachment;
            if (wGPURenderPassDepthStencilAttachment.gpuRenderPassDepthStencilAttachment)
            {
                gpuRenderPassDescriptor.depthStencilAttachment = wGPURenderPassDepthStencilAttachment.gpuRenderPassDepthStencilAttachment;

                const gpuTexture = gpuRenderPassDescriptor.depthStencilAttachment.view.texture;

                //
                depthStencilFormat = gpuTexture.format;
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

        this.effect(() =>
        {
            r_this.gpuRenderPassDescriptor;

            const gpuRenderPassDescriptor = this.gpuRenderPassDescriptor;

            let attachmentSize: { width: number, height: number } = null;
            const colorFormats: GPUTextureFormat[] = [];
            let sampleCount: number;

            const colorAttachments = Array.from(gpuRenderPassDescriptor.colorAttachments);
            for (let i = 0; i < colorAttachments.length; i++)
            {
                const colorAttachment = colorAttachments[i];
                const gpuTexture = colorAttachment.view.texture;
                colorFormats.push(gpuTexture.format);

                if (!attachmentSize)
                {
                    attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
                }
                if (colorAttachment.resolveTarget)
                {
                    sampleCount = gpuTexture.sampleCount;
                }
            }
            const depthStencilFormat = gpuRenderPassDescriptor.depthStencilAttachment?.view.texture.format;

            // 构建渲染通道格式对象
            let renderPassFormat: RenderPassFormat

            const renderPassFormatKey = [attachmentSize.width, attachmentSize.height, ...colorFormats, depthStencilFormat, sampleCount].join(',');
            if (renderPassFormatCache[renderPassFormatKey])
            {
                renderPassFormat = renderPassFormatCache[renderPassFormatKey];
            }
            else
            {
                renderPassFormat = {
                    attachmentSize: attachmentSize,
                    colorFormats: colorFormats,
                    depthStencilFormat: depthStencilFormat,
                    sampleCount: sampleCount as 4,
                };
                renderPassFormatCache[renderPassFormatKey] = renderPassFormat;
            }

            if (renderPassFormat !== this.renderPassFormat)
            {
                r_this.renderPassFormat = renderPassFormat;
            }

        });

        this.destroyCall(() => { r_this.gpuRenderPassDescriptor = null; });
    }

    private _initAttachmentSize(device: GPUDevice, renderPass: RenderPass)
    {
        const r_renderPass = reactive(renderPass);

        this.effect(() =>
        {
            r_renderPass.descriptor;

            const descriptor = renderPass.descriptor;
            if (!descriptor.attachmentSize)
            {
                for (let i = 0; i < descriptor.colorAttachments.length; i++)
                {
                    const colorAttachment = descriptor.colorAttachments[i];
                    if (!colorAttachment) continue;
                    const wGPUTextureLike = WGPUTextureLike.getInstance(device, colorAttachment.view.texture);
                    const gpuTexture = wGPUTextureLike.gpuTexture;

                    reactive(descriptor).attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
                    return;
                }

                if (descriptor.depthStencilAttachment)
                {
                    const wGPUTextureLike = WGPUTextureLike.getInstance(device, descriptor.depthStencilAttachment.view.texture);
                    const gpuTexture = wGPUTextureLike.gpuTexture;
                    reactive(descriptor).attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
                    return;
                }

                throw new Error('渲染通道描述符没有设置附件尺寸，无法初始化附件尺寸');
            }
        });
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

const renderPassFormatCache: { [key: string]: RenderPassFormat } = {}