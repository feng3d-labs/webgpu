import { reactive } from '@feng3d/reactivity';
import { defaultRenderPassColorAttachment, RenderPassColorAttachment, RenderPassDescriptor, Texture } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUTexture } from './WGPUTexture';
import { WGPUTextureLike } from './WGPUTextureLike';
import { WGPUTextureView } from './WGPUTextureView';

/**
 * WebGPU渲染通道颜色附件缓存管理器
 *
 * 负责管理WebGPU渲染通道颜色附件的完整生命周期，包括：
 * - 颜色附件的创建和配置
 * - 响应式监听颜色附件参数变化
 * - 自动重新创建颜色附件当依赖变化时
 * - 多重采样纹理的自动生成和管理
 * - 颜色附件实例的缓存和复用
 * - 资源清理和内存管理
 *
 * 主要功能：
 * 1. **颜色附件管理** - 自动创建和配置GPU颜色附件
 * 2. **多重采样支持** - 自动生成多重采样纹理和解析目标，直接管理纹理生命周期
 * 3. **响应式更新** - 监听颜色附件参数变化，自动重新创建
 * 4. **实例缓存** - 使用WeakMap缓存颜色附件实例，避免重复创建
 * 5. **资源管理** - 自动处理颜色附件和多重采样纹理的清理
 * 6. **尺寸同步** - 自动同步纹理尺寸到渲染通道描述符
 * 7. **生命周期管理** - 统一管理多重采样纹理的创建和销毁
 *
 * 使用场景：
 * - 渲染管线中的颜色输出
 * - 多重采样抗锯齿渲染
 * - 离屏渲染和后期处理
 * - 多渲染目标(MRT)渲染
 * - 渲染通道的配置管理
 */
export class WGPURenderPassColorAttachment extends ReactiveObject
{
    /**
     * WebGPU渲染通道颜色附件对象
     *
     * 这是实际的GPU颜色附件实例，用于在渲染通道中指定颜色输出目标。
     * 当颜色附件配置发生变化时，此对象会自动重新创建。
     */
    readonly gpuRenderPassColorAttachment: GPURenderPassColorAttachment;

    /**
     * 构造函数
     *
     * 创建颜色附件管理器实例，并设置响应式监听。
     *
     * @param device GPU设备实例，用于创建颜色附件
     * @param colorAttachment 颜色附件配置对象，包含视图和操作参数
     * @param descriptor 渲染通道描述符，用于获取采样数等参数
     */
    constructor(device: GPUDevice, colorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
    {
        super();

        // 设置颜色附件创建和更新逻辑
        this._onCreate(device, colorAttachment, descriptor);

        // 将实例注册到设备缓存中
        this._onMap(device, colorAttachment);
    }

    /**
     * 设置颜色附件创建和更新逻辑
     *
     * 使用响应式系统监听颜色附件配置变化，自动重新创建颜色附件。
     * 当颜色附件参数或渲染通道描述符发生变化时，会触发颜色附件的重新创建。
     * 支持多重采样渲染，自动生成多重采样纹理和解析目标。
     * 直接管理多重采样纹理的生命周期，确保资源正确清理。
     *
     * @param device GPU设备实例
     * @param colorAttachment 颜色附件配置对象
     * @param descriptor 渲染通道描述符
     */
    private _onCreate(device: GPUDevice, colorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
    {
        const r_this = reactive(this);
        const r_colorAttachment = reactive(colorAttachment);
        const r_descriptor = reactive(descriptor);

        // 如果渲染通道描述符没有设置附件尺寸，自动从纹理中获取
        if (!descriptor.attachmentSize)
        {
            if (colorAttachment.view.texture)
            {
                const gpuTextureLike = WGPUTextureLike.getInstance(device, colorAttachment.view.texture);
                const gpuTexture = gpuTextureLike.gpuTexture;
                reactive(descriptor).attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
            }
            else
            {
                throw new Error('渲染通道描述符没有设置附件尺寸，也无法从颜色附件与深度模板附件中获取附件尺寸');
            }
        }

        // 多重采样纹理实例，用于管理多重采样纹理的生命周期
        let multisampleGPUTexture: WGPUTexture;

        // 定义销毁函数，用于清理多重采样纹理和颜色附件
        const destroy = () =>
        {
            // 销毁多重采样纹理
            multisampleGPUTexture?.destroy();
            multisampleGPUTexture = null;

            // 清空颜色附件引用
            r_this.gpuRenderPassColorAttachment = null;
        }

        // 监听颜色附件配置变化，自动重新创建颜色附件
        this.effect(() =>
        {
            // 触发响应式依赖，监听颜色附件的所有属性
            r_colorAttachment.view;
            r_colorAttachment.storeOp;
            r_colorAttachment.clearValue?.concat();
            r_colorAttachment.loadOp;

            // 获取纹理视图实例
            const wGPUTextureView = WGPUTextureView.getInstance(device, colorAttachment.view);
            reactive(wGPUTextureView).textureView;

            const textureView = wGPUTextureView.textureView;

            const clearValue = colorAttachment.clearValue ?? defaultRenderPassColorAttachment.clearValue;
            const loadOp = colorAttachment.loadOp ?? defaultRenderPassColorAttachment.loadOp;
            const storeOp = colorAttachment.storeOp ?? defaultRenderPassColorAttachment.storeOp;

            // 创建基础颜色附件配置
            const gpuRenderPassColorAttachment: GPURenderPassColorAttachment = {
                view: textureView,
                clearValue,
                loadOp,
                storeOp,
            };

            if (r_colorAttachment.depthSlice)
            {
                gpuRenderPassColorAttachment.depthSlice = colorAttachment.depthSlice;
            }

            // 检查是否需要多重采样
            const sampleCount = r_descriptor.sampleCount;
            if (sampleCount)
            {
                // 获取原始纹理信息
                const wgpuTexture = WGPUTextureLike.getInstance(device, colorAttachment.view.texture);
                reactive(wgpuTexture).gpuTexture;

                const gpuTexture = wgpuTexture.gpuTexture;

                // 创建多重采样纹理配置
                const multisampleTexture: Texture = {
                    descriptor: {
                        label: '自动生成多重采样的纹理',
                        sampleCount,
                        size: [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers],
                        format: gpuTexture.format,
                    },
                };

                // 创建多重采样纹理实例，直接管理其生命周期
                multisampleGPUTexture = WGPUTexture.getInstance(device, multisampleTexture);
                // 直接从GPU纹理创建视图，避免额外的纹理视图缓存
                const multisampleTextureView = multisampleGPUTexture.gpuTexture.createView();

                // 设置多重采样配置
                gpuRenderPassColorAttachment.view = multisampleTextureView;        // 多重采样纹理作为渲染目标
                gpuRenderPassColorAttachment.resolveTarget = textureView;          // 原始纹理作为解析目标
            }

            // 更新颜色附件引用
            r_this.gpuRenderPassColorAttachment = gpuRenderPassColorAttachment;
        });

        // 注册销毁回调，确保在对象销毁时清理多重采样纹理
        this.destroyCall(destroy);
    }

    /**
     * 将颜色附件实例注册到设备缓存中
     *
     * 使用WeakMap将颜色附件配置对象与其实例关联，实现实例缓存和复用。
     * 当颜色附件配置对象被垃圾回收时，WeakMap会自动清理对应的缓存条目。
     *
     * @param device GPU设备实例，用于存储缓存映射
     * @param colorAttachment 颜色附件配置对象，作为缓存的键
     */
    private _onMap(device: GPUDevice, colorAttachment: RenderPassColorAttachment)
    {
        // 如果设备还没有颜色附件缓存，则创建一个新的WeakMap
        device.colorAttachments ??= new WeakMap();

        // 将当前实例与颜色附件配置对象关联
        device.colorAttachments.set(colorAttachment, this);

        // 注册清理回调，在对象销毁时从缓存中移除
        this.destroyCall(() => { device.colorAttachments?.delete(colorAttachment); })
    }

    /**
     * 获取或创建颜色附件实例
     *
     * 使用单例模式管理颜色附件实例，避免重复创建相同的颜色附件。
     * 如果缓存中已存在对应的实例，则直接返回；否则创建新实例并缓存。
     *
     * @param device GPU设备实例
     * @param colorAttachment 颜色附件配置对象
     * @param descriptor 渲染通道描述符
     * @returns 颜色附件实例
     */
    static getInstance(device: GPUDevice, colorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
    {
        // 尝试从缓存中获取现有实例，如果不存在则创建新实例
        return device.colorAttachments?.get(colorAttachment) || new WGPURenderPassColorAttachment(device, colorAttachment, descriptor);
    }
}

/**
 * 全局类型声明
 *
 * 扩展GPUDevice接口，添加颜色附件实例缓存映射。
 * 这个WeakMap用于缓存颜色附件实例，避免重复创建相同的颜色附件。
 */
declare global
{
    interface GPUDevice
    {
        /** 颜色附件实例缓存映射表 */
        colorAttachments: WeakMap<RenderPassColorAttachment, WGPURenderPassColorAttachment>;
    }
}
