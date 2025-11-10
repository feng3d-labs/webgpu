import { WGPURenderBundle } from '../caches/WGPURenderBundle';
import { RenderBundle } from '../data/RenderBundle';
import { WGPURenderPassEncoder } from '../caches/WGPURenderPassEncoder';

export function runRenderBundle(device: GPUDevice, renderBundle: RenderBundle, state: WGPURenderPassEncoder)
{
    const renderPassFormat = state.renderPassFormat;
    const attachmentSize = state.attachmentSize;

    const wgpuRenderBundle = WGPURenderBundle.getInstance(device, renderBundle, renderPassFormat, attachmentSize);
    const gpuRenderBundle = wgpuRenderBundle.gpuRenderBundle;

    state.executeBundles([gpuRenderBundle]);
}
