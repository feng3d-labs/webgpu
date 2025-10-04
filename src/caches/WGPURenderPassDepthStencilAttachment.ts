import { reactive } from '@feng3d/reactivity';
import { RenderPassDescriptor, Texture } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUTexture } from './WGPUTexture';
import { WGPUTextureLike } from './WGPUTextureLike';
import { WGPUTextureView } from './WGPUTextureView';

/**
 * WebGPU渲染通道深度模板附件缓存管理器
 *
 * 负责管理WebGPU渲染通道深度模板附件的完整生命周期，包括：
 * - 深度模板附件的创建和配置
 * - 响应式监听深度模板附件参数变化
 * - 自动重新创建深度模板附件当依赖变化时
 * - 自动生成深度纹理的管理
 * - 深度模板附件实例的缓存和复用
 * - 资源清理和内存管理
 *
 * 主要功能：
 * 1. **深度模板附件管理** - 自动创建和配置GPU深度模板附件
 * 2. **自动深度纹理生成** - 当未提供深度纹理时自动生成
 * 3. **响应式更新** - 监听深度模板附件参数变化，自动重新创建
 * 4. **实例缓存** - 使用WeakMap缓存深度模板附件实例，避免重复创建
 * 5. **资源管理** - 自动处理深度模板附件和自动生成纹理的清理
 * 6. **尺寸同步** - 自动同步纹理尺寸到渲染通道描述符
 * 7. **生命周期管理** - 统一管理自动生成深度纹理的创建和销毁
 *
 * 使用场景：
 * - 渲染管线中的深度测试
 * - 模板测试和模板写入
 * - 深度预渲染和深度缓冲
 * - 阴影映射和深度图生成
 * - 渲染通道的深度配置管理
 */
export class WGPURenderPassDepthStencilAttachment extends ReactiveObject
{
    /**
     * WebGPU渲染通道深度模板附件对象
     *
     * 这是实际的GPU深度模板附件实例，用于在渲染通道中指定深度和模板测试目标。
     * 当深度模板附件配置发生变化时，此对象会自动重新创建。
     */
    readonly gpuRenderPassDepthStencilAttachment: GPURenderPassDepthStencilAttachment;

    /**
     * 构造函数
     *
     * 创建深度模板附件管理器实例，并设置响应式监听。
     *
     * @param device GPU设备实例，用于创建深度模板附件
     * @param depthStencilAttachment 深度模板附件配置对象，包含视图和操作参数
     * @param descriptor 渲染通道描述符，用于获取附件尺寸等参数
     */
    constructor(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        super();

        // 设置深度模板附件创建和更新逻辑
        this._onCreateGPURenderPassDepthStencilAttachment(device, descriptor);

        // 将实例注册到设备缓存中
        this._onMap(device, descriptor);
    }

    /**
     * 设置深度模板附件创建和更新逻辑
     *
     * 使用响应式系统监听深度模板附件配置变化，自动重新创建深度模板附件。
     * 当深度模板附件参数或渲染通道描述符发生变化时，会触发深度模板附件的重新创建。
     * 支持自动生成深度纹理，当未提供深度纹理时自动创建。
     * 直接管理自动生成深度纹理的生命周期，确保资源正确清理。
     *
     * @param device GPU设备实例
     * @param depthStencilAttachment 深度模板附件配置对象
     * @param descriptor 渲染通道描述符
     */
    private _onCreateGPURenderPassDepthStencilAttachment(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        const r_this = reactive(this);
        const r_descriptor = reactive(descriptor);

        // 如果渲染通道描述符没有设置附件尺寸，自动从纹理中获取
        if (!descriptor.attachmentSize)
        {
            const gpuTextureLike = WGPUTextureLike.getInstance(device, descriptor.depthStencilAttachment.view.texture);
            const gpuTexture = gpuTextureLike.gpuTexture;

            // 设置渲染通道的附件尺寸
            reactive(descriptor).attachmentSize = {
                width: gpuTexture.width,
                height: gpuTexture.height,
            };
        }

        // 自动生成的深度纹理实例，用于管理深度纹理的生命周期
        let autoCreateDepthTexture: WGPUTexture;

        // 定义销毁函数，用于清理自动生成的深度纹理和深度模板附件
        const destroy = () =>
        {
            // 销毁自动生成的深度纹理
            autoCreateDepthTexture?.destroy();
            autoCreateDepthTexture = null;

            // 清空深度模板附件引用
            r_this.gpuRenderPassDepthStencilAttachment = null;
        }

        // 监听深度模板附件配置变化，自动重新创建深度模板附件
        this.effect(() =>
        {
            // 先销毁旧的深度模板附件和自动生成的纹理
            destroy();

            //
            const r_depthStencilAttachment = r_descriptor.depthStencilAttachment;

            // 触发响应式依赖，监听深度模板附件的所有属性
            r_depthStencilAttachment.depthClearValue;
            r_depthStencilAttachment.depthLoadOp;
            r_depthStencilAttachment.depthStoreOp;
            r_depthStencilAttachment.depthReadOnly;
            r_depthStencilAttachment.stencilClearValue;
            r_depthStencilAttachment.stencilLoadOp;
            r_depthStencilAttachment.stencilStoreOp;
            r_depthStencilAttachment.stencilReadOnly;
            r_depthStencilAttachment.view;

            // 获取深度模板附件配置
            const {
                depthClearValue,
                depthLoadOp,
                depthStoreOp,
                depthReadOnly,
                stencilClearValue,
                stencilLoadOp,
                stencilStoreOp,
                stencilReadOnly,
            } = r_depthStencilAttachment;

            let textureView: GPUTextureView;

            const depthStencilAttachment = descriptor.depthStencilAttachment;
            // 如果提供了深度纹理视图，使用现有的纹理视图
            if (depthStencilAttachment.view)
            {
                // 获取深度纹理视图实例
                const wGPUTextureView = WGPUTextureView.getInstance(device, depthStencilAttachment.view);
                reactive(wGPUTextureView).textureView;

                textureView = wGPUTextureView.textureView;
            }
            // 如果没有提供深度纹理视图，自动生成一个
            else
            {
                // 监听渲染通道描述符的附件尺寸变化
                r_descriptor.attachmentSize.width;
                r_descriptor.attachmentSize.height;

                // 创建自动生成的深度纹理配置
                const autoDepthTexture: Texture = {
                    descriptor: {
                        label: '自动生成的深度纹理',
                        size: [descriptor.attachmentSize.width, descriptor.attachmentSize.height],
                        format: 'depth24plus',
                    },
                };

                // 创建自动生成的深度纹理实例，直接管理其生命周期
                autoCreateDepthTexture = WGPUTexture.getInstance(device, autoDepthTexture);
                // 直接从GPU纹理创建视图，避免额外的纹理视图缓存
                textureView = autoCreateDepthTexture.gpuTexture.createView();
            }

            // 创建深度模板附件配置
            const gpuRenderPassDepthStencilAttachment: GPURenderPassDepthStencilAttachment = {
                view: textureView,
                depthClearValue: depthClearValue ?? 1,
                depthLoadOp,
                depthStoreOp,
                depthReadOnly,
                stencilClearValue: stencilClearValue ?? 0,
                stencilLoadOp,
                stencilStoreOp,
                stencilReadOnly,
            };

            // 更新深度模板附件引用
            r_this.gpuRenderPassDepthStencilAttachment = gpuRenderPassDepthStencilAttachment;
        });

        // 注册销毁回调，确保在对象销毁时清理自动生成的深度纹理
        this.destroyCall(destroy);
    }

    /**
     * 将深度模板附件实例注册到设备缓存中
     *
     * 使用WeakMap将深度模板附件配置对象与其实例关联，实现实例缓存和复用。
     * 当深度模板附件配置对象被垃圾回收时，WeakMap会自动清理对应的缓存条目。
     *
     * @param device GPU设备实例，用于存储缓存映射
     * @param depthStencilAttachment 深度模板附件配置对象，作为缓存的键
     */
    private _onMap(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        // 如果设备还没有深度模板附件缓存，则创建一个新的WeakMap
        device.depthStencilAttachments ??= new WeakMap();

        // 将当前实例与深度模板附件配置对象关联
        device.depthStencilAttachments.set(descriptor, this);

        // 注册清理回调，在对象销毁时从缓存中移除
        this.destroyCall(() => { device.depthStencilAttachments?.delete(descriptor); })
    }

    /**
     * 获取或创建深度模板附件实例
     *
     * 使用单例模式管理深度模板附件实例，避免重复创建相同的深度模板附件。
     * 如果缓存中已存在对应的实例，则直接返回；否则创建新实例并缓存。
     *
     * @param device GPU设备实例
     * @param depthStencilAttachment 深度模板附件配置对象
     * @param descriptor 渲染通道描述符
     * @returns 深度模板附件实例
     */
    static getInstance(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        // 尝试从缓存中获取现有实例，如果不存在则创建新实例
        return device.depthStencilAttachments?.get(descriptor) || new WGPURenderPassDepthStencilAttachment(device, descriptor);
    }
}

/**
 * 全局类型声明
 *
 * 扩展GPUDevice接口，添加深度模板附件实例缓存映射。
 * 这个WeakMap用于缓存深度模板附件实例，避免重复创建相同的深度模板附件。
 */
declare global
{
    interface GPUDevice
    {
        /** 深度模板附件实例缓存映射表 */
        depthStencilAttachments: WeakMap<RenderPassDescriptor, WGPURenderPassDepthStencilAttachment>;
    }
}
