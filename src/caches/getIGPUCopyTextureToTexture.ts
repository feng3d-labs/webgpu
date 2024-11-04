import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";

export function getIGPUCopyTextureToTexture(v: IGPUCopyTextureToTexture)
{
    const sourceTexture = v.source.texture;
    const destinationTexture = v.destination.texture;

    const gpuCopyTextureToTexture: IGPUCopyTextureToTexture = {
        ...v,
        source: { texture: sourceTexture },
        destination: { texture: destinationTexture },
    };

    return gpuCopyTextureToTexture;
}