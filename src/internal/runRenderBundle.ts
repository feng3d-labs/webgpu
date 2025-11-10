import { WGPURenderBundle } from '../caches/WGPURenderBundle';
import { RenderBundle } from '../data/RenderBundle';
import { WGPURenderPassCommands } from './WGPURenderObjectState';

export function runRenderBundle(device: GPUDevice, renderBundle: RenderBundle, state: WGPURenderPassCommands)
{
    const renderPassFormat = state.renderPassFormat;
    const attachmentSize = state.attachmentSize;

    const wgpuRenderBundle = WGPURenderBundle.getInstance(device, renderBundle, renderPassFormat, attachmentSize);
    const gpuRenderBundle = wgpuRenderBundle.gpuRenderBundle;

    state.executeBundles([gpuRenderBundle]);
}
