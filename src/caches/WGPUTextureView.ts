import { reactive } from '@feng3d/reactivity';
import { Texture, TextureView } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUTextureLike } from './WGPUTextureLike';

/**
 * WebGPU纹理视图缓存类
 *
 * 负责管理WebGPU纹理视图的创建、更新和销毁
 * 支持响应式监听纹理视图配置变化
 */
export class WGPUTextureView extends ReactiveObject
{
    /**
     * WebGPU纹理视图对象
     */
    readonly textureView: GPUTextureView;

    /**
     * 构造函数
     *
     * @param device GPU设备
     * @param view 纹理视图对象
     */
    constructor(device: GPUDevice, view: TextureView)
    {
        super();

        this._onCreateTextureView(device, view);

        //
        this._onMap(device, view);
    }

    private _onCreateTextureView(device: GPUDevice, view: TextureView)
    {
        const r_this = reactive(this);
        const r_view = reactive(view);

        this.effect(() =>
        {
            r_view.label;
            r_view.texture;
            r_view.baseMipLevel;
            r_view.baseArrayLayer;
            r_view.format;
            r_view.dimension;
            r_view.usage;
            r_view.aspect;
            r_view.mipLevelCount;
            r_view.arrayLayerCount;

            //
            const texture = view.texture;
            const wgpuTexture = WGPUTextureLike.getInstance(device, texture);

            //
            reactive(wgpuTexture).gpuTexture;

            //
            const gpuTexture = wgpuTexture.gpuTexture;

            const label = view.label ?? `${gpuTexture.label}视图`;
            const dimension = view.dimension ?? (view.texture as Texture).descriptor?.dimension;

            //
            const descriptor: GPUTextureViewDescriptor = {
                ...view,
                label,
                dimension,
            }
            r_this.textureView = gpuTexture.createView(descriptor);
        });

        this.destroyCall(() => { r_this.textureView = null; });
    }

    private _onMap(device: GPUDevice, view: TextureView)
    {
        device.textureViews ??= new WeakMap<TextureView, WGPUTextureView>();
        device.textureViews.set(view, this);
        this.destroyCall(() => { device.textureViews.delete(view); });
    }

    /**
     * 获取纹理视图实例
     *
     * @param device GPU设备
     * @param view 纹理视图对象
     * @returns 纹理视图实例
     */
    static getInstance(device: GPUDevice, view: TextureView)
    {
        if (!view) return undefined;

        return device.textureViews?.get(view) || new WGPUTextureView(device, view);
    }
}

declare global
{
    interface GPUDevice
    {
        textureViews: WeakMap<TextureView, WGPUTextureView>;
    }
}