import { IGPUTextureView } from "../data/IGPUTextureView";
import { ITextureView } from "../data/ITextureView";

export function getIGPUTextureView(view: ITextureView)
{
    if (!view) return undefined;

    const gpuTexture = view.texture;

    const gpuTextureView: IGPUTextureView = {
        ...view,
        texture: gpuTexture
    };

    return gpuTextureView;
}
