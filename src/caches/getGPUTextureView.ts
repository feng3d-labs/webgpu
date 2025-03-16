import { anyEmitter } from "@feng3d/event";
import { CanvasTexture, Texture, TextureView } from "@feng3d/render-api";
import { GPUTexture_destroy, GPUTextureView_destroy } from "../eventnames";
import { getGPUTexture } from "./getGPUTexture";

export function getGPUTextureView(device: GPUDevice, view: TextureView)
{
    if ((view.texture as CanvasTexture).context)
    {
        const texture = getGPUTexture(device, view.texture);

        const textureView = texture.createView(view);

        return textureView;
        // texture["view"] = texture["view"] || texture.createView();

        // return texture["view"];
    }

    //
    let textureView = device._textureViewMap.get(view);
    if (textureView) return textureView;

    //
    const texture = view.texture as Texture;
    const gpuTexture = getGPUTexture(device, texture);
    const dimension = view.dimension ?? texture.dimension;

    textureView = gpuTexture.createView({ ...view, dimension });
    device._textureViewMap.set(view, textureView);
    // 销毁纹理时清除对应的纹理视图。
    anyEmitter.once(gpuTexture, GPUTexture_destroy, () =>
    {
        device._textureViewMap.delete(view);
        anyEmitter.emit(textureView, GPUTextureView_destroy);
    });

    return textureView;
}

