import { getGPUTexture } from "../caches/getGPUTexture";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";

export function runCopyTextureToTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, v: IGPUCopyTextureToTexture)
{
    const sourceTexture = getGPUTexture(device, v.source.texture);
    const destinationTexture = getGPUTexture(device, v.destination.texture);

    commandEncoder.copyTextureToTexture(
        {
            texture: sourceTexture,
        },
        {
            texture: destinationTexture,
        },
        v.copySize,
    );
}
