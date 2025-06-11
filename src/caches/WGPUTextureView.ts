import { effect, reactive } from '@feng3d/reactivity';
import { ChainMap, Texture, TextureView } from '@feng3d/render-api';
import { WGPUTexture } from './WGPUTexture';

export class WGPUTextureView
{
    /**
     * 获取纹理视图。
     *
     * @param device 设备。
     * @param view 纹理视图。
     * @returns 纹理视图。
     */
    static getInstance(device: GPUDevice, view: TextureView)
    {
        if (!view) return undefined;

        let result = this.getGPUTextureViewMap.get([device, view]);

        if (result) return result;

        result = new WGPUTextureView(device, view);

        this.getGPUTextureViewMap.set([device, view], result);

        return result;
    }

    private static readonly getGPUTextureViewMap = new ChainMap<[device: GPUDevice, view: TextureView], WGPUTextureView>();

    textureView: GPUTextureView

    constructor(device: GPUDevice, view: TextureView)
    {
        // 监听
        const r_view = reactive(view);

        effect(() =>
        {
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
            const gpuTexture = WGPUTexture.getInstance(device, texture);
            const textureView = gpuTexture.gpuTexture.createView({
                label: label ?? `${gpuTexture.gpuTexture.label}视图`,
                format,
                dimension: dimension ?? (texture as Texture).dimension,
                usage,
                aspect,
                baseMipLevel,
                mipLevelCount,
                baseArrayLayer,
                arrayLayerCount,
            });

            this.textureView = textureView;
        });
    }
}
