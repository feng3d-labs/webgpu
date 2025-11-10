import { WGPURenderBundle } from '../caches/WGPURenderBundle';
import { RenderBundle } from '../data/RenderBundle';
import { RenderPassFormat } from './RenderPassFormat';
import { CommandType, WGPURenderPassCache } from './WGPURenderObjectState';

export function runRenderBundle(device: GPUDevice, state: WGPURenderPassCache, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
{
    const wgpuRenderBundle = WGPURenderBundle.getInstance(device, renderBundle, renderPassFormat, attachmentSize);
    const gpuRenderBundle = wgpuRenderBundle.gpuRenderBundle;

    state.executeBundles([gpuRenderBundle]);
}
