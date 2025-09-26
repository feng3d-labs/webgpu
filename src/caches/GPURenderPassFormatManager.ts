import { computed, Computed, reactive } from '@feng3d/reactivity';
import { RenderPassDescriptor } from '@feng3d/render-api';
import { RenderPassFormat } from '../internal/RenderPassFormat';
import { WGPUTextureLike } from './WGPUTextureLike';

export class GPURenderPassFormatManager
{
    /**
     * 获取渲染通道格式。
     *
     * @param descriptor 渲染通道描述。
     * @returns
     */
    static getGPURenderPassFormat(device: GPUDevice, descriptor: RenderPassDescriptor): RenderPassFormat
    {
        let result = this.getGPURenderPassFormatMap.get(descriptor);

        if (result) return result.value;

        result = computed(() =>
        {
            // 监听
            const r_descriptor = reactive(descriptor);

            r_descriptor.attachmentSize?.width;
            r_descriptor.attachmentSize?.height;
            r_descriptor.colorAttachments?.map((v) => v.view.texture);
            r_descriptor.depthStencilAttachment?.view?.texture;
            r_descriptor.sampleCount;

            // 计算
            const colorAttachmentTextureFormats = descriptor.colorAttachments.map((v) => WGPUTextureLike.getInstance(device, v.view?.texture)?.gpuTexture.format);

            let depthStencilAttachmentTextureFormat: GPUTextureFormat;

            if (descriptor.depthStencilAttachment)
            {
                depthStencilAttachmentTextureFormat = WGPUTextureLike.getInstance(device, descriptor.depthStencilAttachment.view?.texture)?.gpuTexture.format || 'depth24plus';
            }

            const renderPassFormat: RenderPassFormat = {
                attachmentSize: descriptor.attachmentSize,
                colorFormats: colorAttachmentTextureFormats,
                depthStencilFormat: depthStencilAttachmentTextureFormat,
                sampleCount: descriptor.sampleCount,
            };

            // 缓存
            const renderPassFormatKey = `${renderPassFormat.attachmentSize.width},${renderPassFormat.attachmentSize.height
                }|${renderPassFormat.colorFormats.join('')
                }|${renderPassFormat.depthStencilFormat
                }|${renderPassFormat.sampleCount}`;
            const cache = this.renderPassFormatMap[renderPassFormatKey];

            if (cache) return cache;
            this.renderPassFormatMap[renderPassFormatKey] = renderPassFormat;

            return renderPassFormat;
        });
        this.getGPURenderPassFormatMap.set(descriptor, result);

        return result.value;
    }

    private static readonly renderPassFormatMap: Record<string, RenderPassFormat> = {};
    private static readonly getGPURenderPassFormatMap = new WeakMap<RenderPassDescriptor, Computed<RenderPassFormat>>();

}
