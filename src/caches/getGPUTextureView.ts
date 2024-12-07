import { anyEmitter } from "@feng3d/event";
import { IGPUCanvasTexture } from "../data/IGPUCanvasTexture";
import { IGPUTextureView } from "../data/IGPUTextureView";
import { GPUTexture_destroy, GPUTextureView_destroy } from "../eventnames";
import { getGPUTexture } from "./getGPUTexture";

export function getGPUTextureView(device: GPUDevice, view: IGPUTextureView)
{
    const textureViewMap: WeakMap<IGPUTextureView, GPUTextureView> = device["_textureViewMap"] = device["_textureViewMap"] || new WeakMap<IGPUTextureView, GPUTextureView>();

    if ((view.texture as IGPUCanvasTexture).context)
    {
        const texture = getGPUTexture(device, view.texture);

        const textureView = texture.createView(view);

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
    anyEmitter.once(gpuTexture, GPUTexture_destroy, () =>
    {
        textureViewMap.delete(view);
        anyEmitter.emit(textureView, GPUTextureView_destroy);
    });

    return textureView;
}

