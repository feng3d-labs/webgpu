import { IGPUTextureView } from "../data/IGPUTextureView";

export function getIGPUTextureView(view: IGPUTextureView)
{
    if (!view) return undefined;

    const gpuTexture = view.texture;

    const gpuTextureView: IGPUTextureView = {
        ...view,
        texture: gpuTexture
    };

    return gpuTextureView;
}
