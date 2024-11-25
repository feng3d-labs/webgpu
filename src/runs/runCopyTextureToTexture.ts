import { getGPUTexture } from "../caches/getGPUTexture";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";

export function runCopyTextureToTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, copyTextureToTexture: IGPUCopyTextureToTexture)
{
    const sourceTexture = getGPUTexture(device, copyTextureToTexture.source.texture);
    const destinationTexture = getGPUTexture(device, copyTextureToTexture.destination.texture);

    const source: GPUImageCopyTexture = {
        ...copyTextureToTexture.source,
        texture: sourceTexture,
    };

    const destination: GPUImageCopyTexture = {
        ...copyTextureToTexture.destination,
        texture: destinationTexture,
    };

    commandEncoder.copyTextureToTexture(
        source,
        destination,
        copyTextureToTexture.copySize,
    );
}
