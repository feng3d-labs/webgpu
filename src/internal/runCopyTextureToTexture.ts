import { CopyTextureToTexture } from '@feng3d/render-api';
import { WGPUTextureLike } from '../caches/WGPUTextureLike';

export function runCopyTextureToTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, copyTextureToTexture: CopyTextureToTexture)
{
    const sourceTexture = WGPUTextureLike.getInstance(device, copyTextureToTexture.source.texture);
    const gpuSourceTexture = sourceTexture.gpuTexture;

    const destinationTexture = WGPUTextureLike.getInstance(device, copyTextureToTexture.destination.texture);
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