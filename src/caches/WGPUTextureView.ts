import { effect, reactive } from '@feng3d/reactivity';
import { ChainMap, Texture, TextureView } from '@feng3d/render-api';
import { WGPUCanvasTexture } from './WGPUCanvasTexture';
import { WGPUTexture } from './WGPUTexture';
import { WGPUTextureLike } from './WGPUTextureLike';

/**
 * WebGPU纹理视图缓存类
 *
 * 负责管理WebGPU纹理视图的创建、更新和销毁
 * 支持响应式监听纹理视图配置变化
 */
export class WGPUTextureView
{
    /**
     * WebGPU纹理视图对象
     */
    readonly textureView: GPUTextureView;

    /**
     * 纹理视图描述符
     */
    readonly descriptor: GPUTextureViewDescriptor;

    /**
     * WebGPU纹理对象
     * 可以是普通纹理或画布纹理
     */
    readonly wgpuTexture: WGPUTexture | WGPUCanvasTexture;

    /**
     * 纹理视图是否失效
     * true表示需要更新，false表示有效
     */
    readonly invalid: boolean = true;

    /**
     * GPU设备
     */
    private readonly _device: GPUDevice;

    /**
     * 纹理视图对象
     */
    private readonly _view: TextureView;

    /**
     * 构造函数
     *
     * @param device GPU设备
     * @param view 纹理视图对象
     */
    constructor(device: GPUDevice, view: TextureView)
    {
        this._device = device;
        this._view = view;

        // 注册到纹理视图映射表
        WGPUTextureView._gpuTextureViewMap.set([device, view], this);

        const r_this = reactive(this);
        const r_view = reactive(view);

        // 监听纹理变化，重置相关对象
        effect(() =>
        {
            r_view.texture;

            r_this.wgpuTexture = null;
            r_this.textureView = null;
            r_this.invalid = true;
        });

        // 监听视图配置变化，重置描述符和视图
        effect(() =>
        {
            r_view.label;
            r_view.format;
            r_view.dimension;
            r_view.usage;
            r_view.aspect;
            r_view.baseMipLevel;
            r_view.baseArrayLayer;
            r_view.mipLevelCount;
            r_view.arrayLayerCount;

            r_this.descriptor = null;
            r_this.textureView = null;
            r_this.invalid = true;
        });
    }

    /**
     * 更新纹理视图
     *
     * 根据当前状态更新纹理和视图对象
     *
     * @returns 当前实例，支持链式调用
     */
    update()
    {
        if (!this.invalid) return this;

        const r_this = reactive(this);

        // 获取或更新纹理对象
        if (!this.wgpuTexture)
        {
            r_this.wgpuTexture = WGPUTextureLike.getInstance(this._device, this._view.texture);
        }

        // 创建视图描述符
        if (!this.descriptor)
        {
            r_this.descriptor = {
                ...this._view,
                label: this._view.label ?? `${this.wgpuTexture.gpuTexture.label}视图`,
                dimension: this._view.dimension ?? (this._view.texture as Texture).descriptor?.dimension,
            }
        }

        // 创建纹理视图
        if (!this.textureView)
        {
            r_this.textureView = this.wgpuTexture.gpuTexture.createView(this.descriptor);
        }

        r_this.invalid = false;

        return this;
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

        return this._gpuTextureViewMap.get([device, view]) || new WGPUTextureView(device, view);
    }

    /**
     * 纹理视图实例映射表
     *
     * 用于缓存和管理纹理视图实例，避免重复创建
     */
    private static readonly _gpuTextureViewMap = new ChainMap<[device: GPUDevice, view: TextureView], WGPUTextureView>();
}
