import { CopyTextureToTexture, RenderPassDescriptor } from '@feng3d/render-api';
import { WGPUTextureLike } from '../caches/WGPUTextureLike';

export function runCopyTextureToTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, copyTextureToTexture: CopyTextureToTexture, renderPassDescriptor?: RenderPassDescriptor)
{
    let sTexture = copyTextureToTexture.source.texture;
    if (sTexture === null)
    {
        sTexture = renderPassDescriptor?.colorAttachments[0].view.texture;
    }

    const sourceTexture = WGPUTextureLike.getInstance(device, sTexture);
    const gpuSourceTexture = sourceTexture.gpuTexture;

    let dTexture = copyTextureToTexture.destination.texture;
    if (dTexture === null)
    {
        dTexture = renderPassDescriptor?.colorAttachments[0].view.texture;
    }
    const destinationTexture = WGPUTextureLike.getInstance(device, dTexture);
    const gpuDestinationTexture = destinationTexture.gpuTexture;

    const source: GPUTexelCopyTextureInfo = {
        ...copyTextureToTexture.source,
        texture: gpuSourceTexture,
    };

    const destination: GPUTexelCopyTextureInfo = {
        ...copyTextureToTexture.destination,
        texture: gpuDestinationTexture,
    };

    commandEncoder.copyTextureToTexture(source, destination, copyTextureToTexture.copySize);
}