import { ITextureView } from "../data/ITextureView";
import { IGPUTextureView } from "../webgpu-data-driven/data/IGPUTextureView";
import { getIGPUTexture } from "./getIGPUTexture";

export function getIGPUTextureView(view: ITextureView)
{
    if (!view) return undefined;

    const gpuTexture = getIGPUTexture(view.texture);

    const gpuTextureView: IGPUTextureView = {
        ...view,
        texture: gpuTexture
    };

    return gpuTextureView;
}
