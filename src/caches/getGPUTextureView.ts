import { ChainMap, computed, ComputedRef, reactive, Texture, TextureView } from "@feng3d/render-api";
import { getGPUTexture } from "./getGPUTexture";

export function getGPUTextureView(device: GPUDevice, view: TextureView)
{
    if (!view) return undefined;

    const getGPUTextureViewKey: GetGPUTextureViewKey = [device, view];
    let result = getGPUTextureViewMap.get(getGPUTextureViewKey);
    if (result) return result.value;

    result = computed(() =>
    {
        // 监听
        const r_view = reactive(view);
        r_view.texture;

        // 执行
        const { texture } = view;
        const gpuTexture = getGPUTexture(device, texture);
        const textureView = gpuTexture.createView({
            ...r_view,
            dimension: r_view.dimension ?? (texture as Texture).dimension,
        });

        return textureView;
    });
    getGPUTextureViewMap.set(getGPUTextureViewKey, result);

    return result.value;
}

type GetGPUTextureViewKey = [device: GPUDevice, view: TextureView];
const getGPUTextureViewMap = new ChainMap<GetGPUTextureViewKey, ComputedRef<GPUTextureView>>;
