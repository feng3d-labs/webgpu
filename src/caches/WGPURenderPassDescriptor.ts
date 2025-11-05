import { computed, Computed, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderPass, RenderPassDescriptor } from '@feng3d/render-api';
import { RenderPassFormat } from '../internal/RenderPassFormat';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUQuerySet } from './WGPUQuerySet';
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

    constructor(device: GPUDevice, renderPass: RenderPass)
    {
        super();

        this._onCreate(device, renderPass)
        //
        WGPURenderPassDescriptor.map.set([device, renderPass], this);
        this.destroyCall(() => { WGPURenderPassDescriptor.map.delete([device, renderPass]); });
    }

    private _onCreate(device: GPUDevice, renderPass: RenderPass)
    {
        const r_this = reactive(this);
        const r_renderPass = reactive(renderPass);

        this._computedGpuRenderPassDescriptor = computed(() =>
        {
            r_renderPass.descriptor;

            const descriptor: RenderPassDescriptor = renderPass.descriptor;
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

            //
            const wgpuQuerySet = WGPUQuerySet.getInstance(device, renderPass);
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
            return gpuRenderPassDescriptor;
        });

        this._computedRenderPassFormat = computed(() =>
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

            return renderPassFormat;
        });

        this.destroyCall(() => { this._computedGpuRenderPassDescriptor = null; this._computedRenderPassFormat = null; });
    }

    static getInstance(device: GPUDevice, renderPass: RenderPass)
    {
        return this.map.get([device, renderPass]) || new WGPURenderPassDescriptor(device, renderPass);
    }
    private static readonly map = new ChainMap<[GPUDevice, RenderPass], WGPURenderPassDescriptor>();
}

const renderPassFormatCache: { [key: string]: RenderPassFormat } = {}