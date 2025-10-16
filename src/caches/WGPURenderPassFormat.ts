import { reactive } from '@feng3d/reactivity';
import { RenderPassDescriptor } from '@feng3d/render-api';
import { RenderPassFormat } from '../internal/RenderPassFormat';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUTextureLike } from './WGPUTextureLike';

/**
 * WebGPU渲染通道格式封装类
 *
 * 该类负责从RenderPassDescriptor中提取渲染通道格式信息，
 * 并将其转换为内部使用的RenderPassFormat格式。
 * 同时提供缓存机制避免重复创建相同的渲染通道格式对象。
 */
export class WGPURenderPassFormat extends ReactiveObject
{
    /**
     * 对应的渲染通道格式对象
     * 只读属性，当RenderPassDescriptor发生变化时会自动更新
     */
    readonly renderPassFormat: RenderPassFormat;

    /**
     * 构造函数
     * @param device GPU设备对象
     * @param descriptor 渲染通道描述符
     */
    constructor(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        super();

        this._onCreateGPURenderPassFormat(device, descriptor);
        this._onMap(device, descriptor);
    }

    /**
     * 创建并监听渲染通道格式变化
     *
     * 从RenderPassDescriptor中提取颜色附件、深度模板附件等信息，
     * 构建RenderPassFormat对象，并监听相关属性变化以实现自动更新。
     *
     * @param device GPU设备对象
     * @param descriptor 渲染通道描述符
     */
    private _onCreateGPURenderPassFormat(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        const r_this = reactive(this);
        const r_descriptor = reactive(descriptor);

        this.effect(() =>
        {
            // 监听描述符中的相关属性变化
            r_descriptor.attachmentSize?.width;
            r_descriptor.attachmentSize?.height;
            r_descriptor.colorAttachments?.map((v) => v.view.texture);
            r_descriptor.depthStencilAttachment?.view?.texture;
            r_descriptor.sampleCount;

            // 计算颜色附件的纹理格式
            const colorAttachmentTextureFormats: GPUTextureFormat[] = [];

            const attachmentSize = { ...descriptor.attachmentSize };

            descriptor.colorAttachments.forEach((v) =>
            {
                const wgpuTextureLike = WGPUTextureLike.getInstance(device, v.view?.texture);
                // reactive(wgpuTextureLike).gpuTexture;
                const gpuTexture = wgpuTextureLike.gpuTexture;

                colorAttachmentTextureFormats.push(gpuTexture.format);

                if (attachmentSize.width === undefined)
                {
                    attachmentSize.width = gpuTexture.width;
                }

                if (attachmentSize.height === undefined)
                {
                    attachmentSize.height = gpuTexture.height;
                }
            });

            // 计算深度模板附件的纹理格式
            let depthStencilAttachmentTextureFormat: GPUTextureFormat;

            if (descriptor.depthStencilAttachment)
            {
                const wgpuTextureLike = WGPUTextureLike.getInstance(device, descriptor.depthStencilAttachment.view.texture);
                // reactive(wgpuTextureLike).gpuTexture;
                const gpuTexture = wgpuTextureLike.gpuTexture;

                //
                depthStencilAttachmentTextureFormat = gpuTexture.format;

                if (attachmentSize.width === undefined)
                {
                    attachmentSize.width = gpuTexture.width;
                }
                if (attachmentSize.height === undefined)
                {
                    attachmentSize.height = gpuTexture.height;
                }
            }

            // 构建渲染通道格式对象
            const renderPassFormat: RenderPassFormat = {
                attachmentSize: attachmentSize,
                colorFormats: colorAttachmentTextureFormats,
                depthStencilFormat: depthStencilAttachmentTextureFormat,
                sampleCount: descriptor.sampleCount,
            };

            r_this.renderPassFormat = renderPassFormat;
        });
    }

    /**
     * 建立RenderPassDescriptor到WGPURenderPassFormat实例的映射关系
     *
     * 使用WeakMap将RenderPassDescriptor与实例进行映射，避免重复创建相同的渲染通道格式。
     * 当实例销毁时，从映射表中移除对应关系。
     *
     * @param device GPU设备对象
     * @param descriptor 渲染通道描述符
     */
    private _onMap(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        device.renderPassFormats ??= new WeakMap<RenderPassDescriptor, WGPURenderPassFormat>();
        device.renderPassFormats.set(descriptor, this);
        this.destroyCall(() => { device.renderPassFormats.delete(descriptor); });
    }

    /**
     * 获取渲染通道格式实例
     *
     * 根据给定的参数获取对应的WGPURenderPassFormat实例，如果不存在则创建新实例。
     *
     * @param device GPU设备对象
     * @param descriptor 渲染通道描述符
     * @returns 对应的WGPURenderPassFormat实例
     */
    static getInstance(device: GPUDevice, descriptor: RenderPassDescriptor)
    {
        return device.renderPassFormats?.get(descriptor) || new WGPURenderPassFormat(device, descriptor);
    }
}

declare global
{
    /**
     * 扩展GPUDevice接口，添加渲染通道格式缓存映射表
     */
    interface GPUDevice
    {
        /**
         * 渲染通道格式缓存映射表
         * 使用WeakMap存储RenderPassDescriptor对应的WGPURenderPassFormat实例
         */
        renderPassFormats: WeakMap<RenderPassDescriptor, WGPURenderPassFormat>;
    }
}