import { computed, Computed, reactive } from "@feng3d/reactivity";
import { RenderPassDescriptor } from "@feng3d/render-api";
import { getGPUTextureFormat } from "../caches/getGPUTextureFormat";
import { RenderPassFormat } from "../internal/RenderPassFormat";

/**
 * 获取渲染通道格式。
 *
 * @param descriptor 渲染通道描述。
 * @returns
 */
export function getGPURenderPassFormat(descriptor: RenderPassDescriptor): RenderPassFormat
{
    let result = getGPURenderPassFormatMap.get(descriptor);
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
        const colorAttachmentTextureFormats = descriptor.colorAttachments.map((v) => getGPUTextureFormat(v.view.texture));

        let depthStencilAttachmentTextureFormat: GPUTextureFormat;
        if (descriptor.depthStencilAttachment)
        {
            depthStencilAttachmentTextureFormat = getGPUTextureFormat(descriptor.depthStencilAttachment.view?.texture) || "depth24plus";
        }

        const renderPassFormat: RenderPassFormat = {
            attachmentSize: descriptor.attachmentSize,
            colorFormats: colorAttachmentTextureFormats,
            depthStencilFormat: depthStencilAttachmentTextureFormat,
            sampleCount: descriptor.sampleCount,
        };

        // 缓存
        const renderPassFormatKey = renderPassFormat.attachmentSize.width + "," + renderPassFormat.attachmentSize.height
            + "|" + renderPassFormat.colorFormats.join('')
            + "|" + renderPassFormat.depthStencilFormat
            + "|" + renderPassFormat.sampleCount;
        const cache = renderPassFormatMap[renderPassFormatKey];
        if (cache) return cache;
        renderPassFormatMap[renderPassFormatKey] = renderPassFormat;

        return renderPassFormat;
    });
    getGPURenderPassFormatMap.set(descriptor, result);

    return result.value;
}
const renderPassFormatMap: Record<string, RenderPassFormat> = {};
const getGPURenderPassFormatMap = new WeakMap<RenderPassDescriptor, Computed<RenderPassFormat>>();
