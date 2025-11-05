import { reactive } from '@feng3d/reactivity';
import { Texture, TextureView } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUTextureLike } from './WGPUTextureLike';

/**
 * WebGPU纹理视图缓存管理器
 *
 * 负责管理WebGPU纹理视图的完整生命周期，包括：
 * - 纹理视图的创建和配置
 * - 响应式监听纹理视图参数变化
 * - 自动重新创建纹理视图当依赖变化时
 * - 纹理视图实例的缓存和复用
 * - 资源清理和内存管理
 *
 * 主要功能：
 * 1. **响应式更新** - 监听纹理视图配置变化，自动重新创建纹理视图
 * 2. **实例缓存** - 使用WeakMap缓存纹理视图实例，避免重复创建
 * 3. **资源管理** - 自动处理纹理视图的创建和销毁
 * 4. **依赖追踪** - 监听底层纹理变化，确保纹理视图与纹理保持同步
 *
 * 使用场景：
 * - 渲染管线中的纹理采样
 * - 计算着色器中的纹理访问
 * - 纹理数组和立方体贴图的不同视图
 * - 多级纹理的不同mip级别访问
 */
export class WGPUTextureView extends ReactiveObject
{
    /**
     * WebGPU纹理视图对象
     *
     * 这是实际的GPU纹理视图实例，用于在渲染管线中访问纹理数据。
     * 当纹理视图配置发生变化时，此对象会自动重新创建。
     */
    readonly textureView: GPUTextureView;

    /**
     * 构造函数
     *
     * 创建纹理视图管理器实例，并设置响应式监听。
     *
     * @param device GPU设备实例，用于创建纹理视图
     * @param view 纹理视图配置对象，包含视图参数
     */
    constructor(device: GPUDevice, view: TextureView)
    {
        super();

        // 设置纹理视图创建和更新逻辑
        this._onCreateTextureView(device, view);

        // 将实例注册到设备缓存中
        this._onMap(device, view);
    }

    /**
     * 设置纹理视图创建和更新逻辑
     *
     * 使用响应式系统监听纹理视图配置变化，自动重新创建纹理视图。
     * 当纹理视图参数或底层纹理发生变化时，会触发纹理视图的重新创建。
     *
     * @param device GPU设备实例
     * @param view 纹理视图配置对象
     */
    private _onCreateTextureView(device: GPUDevice, view: TextureView)
    {
        const r_this = reactive(this);
        const r_view = reactive(view);

        // 监听纹理视图配置变化，自动重新创建纹理视图
        this.effect(() =>
        {
            // 获取底层纹理的WebGPU纹理实例
            r_view.texture
            const wgpuTexture = WGPUTextureLike.getInstance(device, view.texture);
            const gpuTexture = wgpuTexture.gpuTexture;

            // 生成纹理视图标签，如果没有指定则使用纹理标签
            const label = r_view.label ?? `${gpuTexture.label}视图`;
            // 如果没有指定维度，则从纹理描述符中获取
            const dimension = r_view.dimension ?? (r_view.texture as Texture).descriptor?.dimension;

            const baseMipLevel = r_view.baseMipLevel;
            const baseArrayLayer = r_view.baseArrayLayer;
            const format = r_view.format;
            const usage = r_view.usage;
            const aspect = r_view.aspect;
            const mipLevelCount = r_view.mipLevelCount;
            const arrayLayerCount = r_view.arrayLayerCount;

            // 创建纹理视图描述符
            const descriptor: GPUTextureViewDescriptor = {
                label,
                dimension,
                baseMipLevel,
                baseArrayLayer,
                format,
                usage,
                aspect,
                mipLevelCount,
                arrayLayerCount,
            }

            // 创建新的纹理视图
            r_this.textureView = gpuTexture.createView(descriptor);
        });

        // 注册清理回调，在对象销毁时清理纹理视图引用
        this.destroyCall(() => { r_this.textureView = null; });
    }

    /**
     * 将纹理视图实例注册到设备缓存中
     *
     * 使用WeakMap将纹理视图配置对象与其实例关联，实现实例缓存和复用。
     * 当纹理视图配置对象被垃圾回收时，WeakMap会自动清理对应的缓存条目。
     *
     * @param device GPU设备实例，用于存储缓存映射
     * @param view 纹理视图配置对象，作为缓存的键
     */
    private _onMap(device: GPUDevice, view: TextureView)
    {
        // 如果设备还没有纹理视图缓存，则创建一个新的WeakMap
        device.textureViews ??= new WeakMap<TextureView, WGPUTextureView>();

        // 将当前实例与纹理视图配置对象关联
        device.textureViews.set(view, this);

        // 注册清理回调，在对象销毁时从缓存中移除
        this.destroyCall(() => { device.textureViews.delete(view); });
    }

    /**
     * 获取或创建纹理视图实例
     *
     * 使用单例模式管理纹理视图实例，避免重复创建相同的纹理视图。
     * 如果缓存中已存在对应的实例，则直接返回；否则创建新实例并缓存。
     *
     * @param device GPU设备实例
     * @param view 纹理视图配置对象
     * @returns 纹理视图实例，如果view为null/undefined则返回undefined
     */
    static getInstance(device: GPUDevice, view: TextureView)
    {
        // 如果纹理视图配置为空，直接返回undefined
        if (!view) return undefined;

        // 尝试从缓存中获取现有实例，如果不存在则创建新实例
        return device.textureViews?.get(view) || new WGPUTextureView(device, view);
    }
}

/**
 * 全局类型声明
 *
 * 扩展GPUDevice接口，添加纹理视图缓存映射。
 * 这个WeakMap用于缓存纹理视图实例，避免重复创建相同的纹理视图。
 */
declare global
{
    interface GPUDevice
    {
        /** 纹理视图实例缓存映射表 */
        textureViews: WeakMap<TextureView, WGPUTextureView>;
    }

    interface GPUTextureView
    {
        texture: GPUTexture;
    }
}

((createView: (descriptor: GPUTextureViewDescriptor) => GPUTextureView) =>
{
    GPUTexture.prototype.createView = function (this: GPUTexture, descriptor: GPUTextureViewDescriptor): GPUTextureView
    {
        const textureView: GPUTextureView = createView.call(this, descriptor);
        textureView.texture = this;
        return textureView;
    }
})(GPUTexture.prototype.createView);
