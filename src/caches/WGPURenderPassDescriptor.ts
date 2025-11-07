import { computed, Computed, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderPassColorAttachment, RenderPassDescriptor } from '@feng3d/render-api';
import { RenderPassFormat } from '../internal/RenderPassFormat';
import { ReactiveObject } from '../ReactiveObject';
import { WGPURenderPassColorAttachment } from './WGPURenderPassColorAttachment';
import { WGPURenderPassDepthStencilAttachment } from './WGPURenderPassDepthStencilAttachment';
import { WGPUTextureLike } from './WGPUTextureLike';
import { WGPUTimestampQuery } from './WGPUTimestampQuery';

export class WGPURenderPassDescriptor extends ReactiveObject
{
    get gpuRenderPassDescriptor() { return this._computedGpuRenderPassDescriptor.value; }
    private _computedGpuRenderPassDescriptor: Computed<GPURenderPassDescriptor>;

    get renderPassFormat() { return this._computedRenderPassFormat.value; }
    private _computedRenderPassFormat: Computed<RenderPassFormat>;

    constructor(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        super();

        this._onCreate(device, descriptor)
        //
        WGPURenderPassDescriptor.map.set([device, descriptor], this);
        this.destroyCall(() => { WGPURenderPassDescriptor.map.delete([device, descriptor]); });
    }

    private _onCreate(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        const r_descriptor = reactive(descriptor);

        // 如果渲染通道描述符没有设置附件尺寸，自动从纹理中获取
        if (!descriptor.attachmentSize)
        {
            for (const colorAttachment of descriptor.colorAttachments)
            {
                if (colorAttachment.view.texture)
                {
                    const gpuTextureLike = WGPUTextureLike.getInstance(device, colorAttachment.view.texture);
                    const gpuTexture = gpuTextureLike.gpuTexture;
                    r_descriptor.attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
                    break;
                }
            }
            if (!descriptor.attachmentSize)
            {
                const gpuTextureLike = WGPUTextureLike.getInstance(device, descriptor.depthStencilAttachment.view.texture);
                const gpuTexture = gpuTextureLike.gpuTexture;
                r_descriptor.attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
            }
        }

        this._computedGpuRenderPassDescriptor = computed(() =>
        {
            //
            const label = r_descriptor.label;

            //
            r_descriptor.colorAttachments?.concat();
            const gpuColorAttachments = descriptor.colorAttachments.reduce((pre: GPURenderPassColorAttachment[], v) =>
            {
                if (!v) return pre;

                const wgpuRenderPassColorAttachment = WGPURenderPassColorAttachment.getInstance(device, v, descriptor);
                const attachment = wgpuRenderPassColorAttachment.gpuRenderPassColorAttachment;

                pre.push(attachment);

                return pre;
            }, []);

            //
            const gpuRenderPassDescriptor: GPURenderPassDescriptor = {
                label: label,
                colorAttachments: gpuColorAttachments,
            };

            r_descriptor.timestampQuery;
            if (descriptor.timestampQuery)
            {
                const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(device, descriptor.timestampQuery);
                gpuRenderPassDescriptor.timestampWrites = wGPUTimestampQuery?.gpuPassTimestampWrites;
            }

            //
            const wGPURenderPassDepthStencilAttachment = WGPURenderPassDepthStencilAttachment.getInstance(device, descriptor);
            if (wGPURenderPassDepthStencilAttachment.gpuRenderPassDepthStencilAttachment)
            {
                gpuRenderPassDescriptor.depthStencilAttachment = wGPURenderPassDepthStencilAttachment.gpuRenderPassDepthStencilAttachment;
            }

            //
            r_descriptor.maxDrawCount;
            if (r_descriptor.maxDrawCount !== undefined)
            {
                gpuRenderPassDescriptor.maxDrawCount = descriptor.maxDrawCount;
            }

            //
            return gpuRenderPassDescriptor;
        });

        const getAttachmentFormat = (attachment: RenderPassColorAttachment) =>
        {
            const r_attachment = reactive(attachment);
            return computed(() =>
            {
                r_attachment.view.texture;

                const texture = attachment.view.texture;

                const wGPUTextureLike = WGPUTextureLike.getInstance(device, texture);
                const gpuTexture = wGPUTextureLike.gpuTexture;


                return gpuTexture.format;
            }).value;
        }

        this._computedRenderPassFormat = computed(() =>
        {
            let sampleCount: number = r_descriptor.sampleCount;

            const colorFormats: GPUTextureFormat[] = [];

            r_descriptor.colorAttachments?.concat();
            const colorAttachments = descriptor.colorAttachments;
            for (let i = 0; i < colorAttachments.length; i++)
            {
                const format = getAttachmentFormat(colorAttachments[i]);
                colorFormats.push(format);
            }

            let depthStencilFormat: GPUTextureFormat;
            if (r_descriptor.depthStencilAttachment?.view.texture)
            {
                depthStencilFormat = WGPUTextureLike.getInstance(device, r_descriptor.depthStencilAttachment?.view.texture)?.gpuTexture.format;
            }

            // 构建渲染通道格式对象
            let renderPassFormat: RenderPassFormat

            const renderPassFormatKey = [...colorFormats, depthStencilFormat, sampleCount].join(',');
            if (renderPassFormatCache[renderPassFormatKey])
            {
                renderPassFormat = renderPassFormatCache[renderPassFormatKey];
            }
            else
            {
                renderPassFormat = {
                    colorFormats: colorFormats,
                    depthStencilFormat: depthStencilFormat,
                    sampleCount: sampleCount as 4,
                };
                renderPassFormatCache[renderPassFormatKey] = renderPassFormat;
            }

            return renderPassFormat;
        });
    }

    static getInstance(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        return this.map.get([device, descriptor]) || new WGPURenderPassDescriptor(device, descriptor);
    }
    private static readonly map = new ChainMap<[GPUDevice, RenderPassDescriptor], WGPURenderPassDescriptor>();
}

const renderPassFormatCache: { [key: string]: RenderPassFormat } = {}