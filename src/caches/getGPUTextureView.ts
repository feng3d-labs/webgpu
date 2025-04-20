import { ChainMap, computed, Computed, reactive, Texture, TextureView } from "@feng3d/render-api";
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
        r_view.label;
        r_view.format;
        r_view.dimension;
        r_view.usage;
        r_view.aspect;
        r_view.baseMipLevel;
        r_view.baseArrayLayer;
        r_view.mipLevelCount;
        r_view.arrayLayerCount;

        // 执行
        const { texture, label, format, dimension, usage, aspect, baseMipLevel, baseArrayLayer, mipLevelCount, arrayLayerCount } = view;
        const gpuTexture = getGPUTexture(device, texture);
        const textureView = gpuTexture.createView({
            label: label ?? `${gpuTexture.label}视图`,
            format,
            dimension: dimension ?? (texture as Texture).dimension,
            usage,
            aspect,
            baseMipLevel,
            mipLevelCount,
            baseArrayLayer,
            arrayLayerCount,

        });

        return textureView;
    });
    getGPUTextureViewMap.set(getGPUTextureViewKey, result);

    return result.value;
}

type GetGPUTextureViewKey = [device: GPUDevice, view: TextureView];
const getGPUTextureViewMap = new ChainMap<GetGPUTextureViewKey, Computed<GPUTextureView>>;
