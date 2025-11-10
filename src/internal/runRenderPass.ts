import { RenderPass } from '@feng3d/render-api';
import { WGPUQuerySet } from '../caches/WGPUQuerySet';
import { WGPURenderPassCache } from '../caches/WGPURenderPassCache';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';

export function runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass)
{
    const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass.descriptor);
    const renderPassDescriptor = wgpuRenderPassDescriptor.gpuRenderPassDescriptor;

    //
    const wgpuQuerySet = WGPUQuerySet.getInstance(device, renderPass);
    if (wgpuQuerySet.gpuQuerySet)
    {
        renderPassDescriptor.occlusionQuerySet = wgpuQuerySet.gpuQuerySet;
    }

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    const state = WGPURenderPassCache.getInstance(device, renderPass);

    state.commands.runCommands(passEncoder);

    passEncoder.end();

    renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
    renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
}
