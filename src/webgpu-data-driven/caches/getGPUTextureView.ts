import { IGPUBindingResource } from "../data/IGPUBindGroup";
import { IGPUTextureView } from "../data/IGPUTextureView";
import { getGPUTexture, gpuTextureEventEmitter, isFromContext } from "./getGPUTexture";

export function getGPUTextureView(device: GPUDevice, view: IGPUTextureView)
{
    if (isFromContext(view.texture))
    {
        const texture = getGPUTexture(device, view.texture);

        const textureView = texture.createView({ dimension: view.dimension });

        return textureView;
    }

    //
    let textureView = textureViewMap.get(view);
    if (textureView) return textureView;

    //
    const gpuTexture = getGPUTexture(device, view.texture);
    textureView = gpuTexture.createView(view);
    textureViewMap.set(view, textureView);
    // 销毁纹理时清除对应的纹理视图。
    gpuTextureEventEmitter.once(gpuTexture, "destroy", () =>
    {
        textureViewMap.delete(view);
    });

    return textureView;
}

const textureViewMap = new WeakMap<IGPUTextureView, GPUTextureView>();

export function isTextureView(arg: IGPUBindingResource): arg is IGPUTextureView
{
    return !!(arg as IGPUTextureView)?.texture;
}
