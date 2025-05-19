import { computed, Computed, reactive } from '@feng3d/reactivity';
import { ChainMap, Texture, TextureView } from '@feng3d/render-api';
import { GPUTextureManager } from './GPUTextureManager';

export class GPUTextureViewManager
{
    /**
     * 获取纹理视图。
     *
     * @param device 设备。
     * @param view 纹理视图。
     * @returns 纹理视图。
     */
    static getGPUTextureView(device: GPUDevice, view: TextureView)
    {
        if (!view) return undefined;

        const getGPUTextureViewKey: GetGPUTextureViewKey = [device, view];
        let result = this.getGPUTextureViewMap.get(getGPUTextureViewKey);

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
            const gpuTexture = GPUTextureManager.getInstance(device).getGPUTexture(texture);
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
        this.getGPUTextureViewMap.set(getGPUTextureViewKey, result);

        return result.value;
    }

    private static readonly getGPUTextureViewMap = new ChainMap<GetGPUTextureViewKey, Computed<GPUTextureView>>();
}

type GetGPUTextureViewKey = [device: GPUDevice, view: TextureView];
