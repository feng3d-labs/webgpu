import { anyEmitter } from "@feng3d/event";
import { ITexture, ITextureView } from "@feng3d/render-api";
import { IGPUCanvasTexture } from "../data/IGPUCanvasTexture";
import { GPUTexture_destroy, GPUTextureView_destroy } from "../eventnames";
import { getGPUTexture } from "./getGPUTexture";

export function getGPUTextureView(device: GPUDevice, view: ITextureView)
{
    const textureViewMap: WeakMap<ITextureView, GPUTextureView> = device["_textureViewMap"] = device["_textureViewMap"] || new WeakMap<ITextureView, GPUTextureView>();

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
    const texture = view.texture as ITexture;
    const gpuTexture = getGPUTexture(device, texture);
    const dimension = view.dimension ?? texture.dimension ?? gpuTexture.dimension;

    textureView = gpuTexture.createView({ ...view, dimension });
    textureViewMap.set(view, textureView);
    // 销毁纹理时清除对应的纹理视图。
    anyEmitter.once(gpuTexture, GPUTexture_destroy, () =>
    {
        textureViewMap.delete(view);
        anyEmitter.emit(textureView, GPUTextureView_destroy);
    });

    return textureView;
}

