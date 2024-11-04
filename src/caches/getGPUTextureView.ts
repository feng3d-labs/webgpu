import { AnyEmitter, anyEmitter } from "@feng3d/event";
import { IGPUTextureView } from "../data/IGPUTextureView";
import { getGPUTexture, gpuTextureEventEmitter, isFromContext } from "./getGPUTexture";

/**
 * GPUTexture 相关事件。
 */
interface IGPUTextureViewEvent
{
    /**
     * 销毁事件。
     */
    "destroy": undefined;
}

/**
 * GPUTexture 事件派发器。
 */
export const gpuTextureViewEventEmitter: AnyEmitter<GPUTextureView, IGPUTextureViewEvent> = <any>anyEmitter;

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
        gpuTextureViewEventEmitter.emit(textureView, "destroy");
    });

    return textureView;
}

const textureViewMap = new WeakMap<IGPUTextureView, GPUTextureView>();
