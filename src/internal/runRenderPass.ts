import { RenderPass, RenderPassDescriptor } from '@feng3d/render-api';
import { WGPUQuerySet } from '../caches/WGPUQuerySet';
import { WGPURenderPass } from '../caches/WGPURenderPass';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';

export function runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass, defaultRenderPassDescriptor?: RenderPassDescriptor)
{
    const descriptor = renderPass.descriptor || defaultRenderPassDescriptor;
    const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, descriptor);
    const renderPassDescriptor = wgpuRenderPassDescriptor.gpuRenderPassDescriptor;

    //
    const wgpuQuerySet = WGPUQuerySet.getInstance(device, renderPass);
    if (wgpuQuerySet.gpuQuerySet)
    {
        renderPassDescriptor.occlusionQuerySet = wgpuQuerySet.gpuQuerySet;
    }

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    const state = WGPURenderPass.getInstance(device, renderPass, defaultRenderPassDescriptor);

    state.commands.runCommands(passEncoder);

    passEncoder.end();

    renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
    renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
}
