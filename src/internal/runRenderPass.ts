import { CanvasContext, RenderPass, RenderPassDescriptor } from '@feng3d/render-api';
import { WGPUQuerySet } from '../caches/WGPUQuerySet';
import { WGPURenderPass } from '../caches/WGPURenderPass';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';
import { WGPUTextureLike } from '../caches/WGPUTextureLike';
import { flipRTTTexture } from '../utils/flipRTTTexture';

export function runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass, canvasContext?: CanvasContext, autoFlipRTT?: boolean)
{
    const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass.descriptor, canvasContext);
    const renderPassDescriptor = wgpuRenderPassDescriptor.gpuRenderPassDescriptor;

    //
    const wgpuQuerySet = WGPUQuerySet.getInstance(device, renderPass);
    if (wgpuQuerySet.gpuQuerySet)
    {
        renderPassDescriptor.occlusionQuerySet = wgpuQuerySet.gpuQuerySet;
    }

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    const state = WGPURenderPass.getInstance(device, renderPass, canvasContext);

    state.commands.runCommands(passEncoder);

    passEncoder.end();

    renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
    renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);

    // 自动翻转 RTT 纹理的 Y 轴
    if (autoFlipRTT)
    {
        flipRTTTextures(device, commandEncoder, renderPass.descriptor);
    }
}

/**
 * 翻转渲染通道中的 RTT 纹理
 */
function flipRTTTextures(device: GPUDevice, commandEncoder: GPUCommandEncoder, descriptor: RenderPassDescriptor)
{
    if (!descriptor?.colorAttachments)
    {
        return;
    }

    // 用于跟踪已翻转的纹理层，避免重复翻转
    const flippedLayers = new Set<string>();

    for (const colorAttachment of descriptor.colorAttachments)
    {
        const view = colorAttachment?.view;
        if (!view)
        {
            continue;
        }

        // 获取纹理（可能是 Texture 或 CanvasTexture）
        const texture = view.texture;
        if (!texture || 'context' in texture)
        {
            // 跳过 CanvasTexture（画布纹理不需要翻转）
            continue;
        }

        // 获取 GPU 纹理
        const wgpuTexture = WGPUTextureLike.getInstance(device, texture);
        if (!wgpuTexture?.gpuTexture)
        {
            continue;
        }

        // 获取数组层索引（用于 2d-array 纹理）
        const baseArrayLayer = view.baseArrayLayer ?? 0;

        // 生成唯一键，避免重复翻转同一纹理层
        const layerKey = `${wgpuTexture.gpuTexture.label || 'texture'}_${baseArrayLayer}`;
        if (flippedLayers.has(layerKey))
        {
            continue;
        }
        flippedLayers.add(layerKey);

        // 翻转指定层
        flipRTTTexture(device, commandEncoder, wgpuTexture.gpuTexture, { baseArrayLayer });
    }
}
