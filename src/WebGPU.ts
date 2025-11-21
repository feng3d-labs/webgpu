import { Computed, computed, reactive } from '@feng3d/reactivity';
import { Buffer, CanvasContext, CanvasRenderPassDescriptor, ReadPixels, RenderPassColorAttachment, RenderPassDepthStencilAttachment, RenderPassDescriptor, Submit, TextureLike, TypedArray, unreadonly } from '@feng3d/render-api';

import { WGPUBuffer } from './caches/WGPUBuffer';
import { WGPUTextureLike } from './caches/WGPUTextureLike';
import './data/polyfills/RenderObject';
import './data/polyfills/RenderPass';
import { runSubmit } from './internal/runSubmit';
import { copyDepthTexture } from './utils/copyDepthTexture';
import { getGPUDevice } from './utils/getGPUDevice';
import { readPixels } from './utils/readPixels';
import { textureInvertYPremultiplyAlpha } from './utils/textureInvertYPremultiplyAlpha';

/**
 * WebGPU
 */
export class WebGPU
{
    /**
     * 初始化 WebGPU 获取 GPUDevice 。
     */
    async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        const r_this = reactive(this);

        r_this.device = await getGPUDevice(options, descriptor);
        //
        this.device?.lost.then(async (info) =>
        {
            console.error(`WebGPU device was lost: ${info.message}`);

            // 'reason' will be 'destroyed' if we intentionally destroy the device.
            if (info.reason !== 'destroyed')
            {
                // try again
                r_this.device = await getGPUDevice(options, descriptor);
            }
        });

        return this;
    }

    readonly device: GPUDevice;

    private _renderPassDescriptorComputed: Computed<RenderPassDescriptor>;

    constructor(canvasContext?: CanvasContext, canvasRenderPassDescriptor?: CanvasRenderPassDescriptor)
    {
        this._initRenderPassDescriptorComputed(canvasContext, canvasRenderPassDescriptor);
    }

    private _initRenderPassDescriptorComputed(canvasContext?: CanvasContext, canvasRenderPassDescriptor?: CanvasRenderPassDescriptor)
    {
        if (canvasContext)
        {
            const colorAttachment: RenderPassColorAttachment = { view: { texture: { context: canvasContext } } };
            const depthStencilAttachment: RenderPassDepthStencilAttachment = {};
            //
            const descriptor: RenderPassDescriptor = {
                colorAttachments: [colorAttachment],
            };

            this._renderPassDescriptorComputed = computed(() =>
            {
                if (!canvasRenderPassDescriptor) return descriptor;

                const r_canvasRenderPassDescriptor = reactive(canvasRenderPassDescriptor);
                //
                r_canvasRenderPassDescriptor.clearColorValue;
                reactive(descriptor.colorAttachments[0]).clearValue = canvasRenderPassDescriptor.clearColorValue;

                r_canvasRenderPassDescriptor.loadColorOp;
                reactive(descriptor.colorAttachments[0]).loadOp = canvasRenderPassDescriptor.loadColorOp;

                let hasDepthStencilAttachment = false;
                if (r_canvasRenderPassDescriptor.depthClearValue !== undefined)
                {
                    hasDepthStencilAttachment = true;
                    reactive(depthStencilAttachment).depthClearValue = r_canvasRenderPassDescriptor.depthClearValue;
                }
                else
                {
                    delete unreadonly(depthStencilAttachment).depthClearValue;
                }
                if (r_canvasRenderPassDescriptor.depthLoadOp !== undefined)
                {
                    hasDepthStencilAttachment = true;
                    reactive(depthStencilAttachment).depthLoadOp = r_canvasRenderPassDescriptor.depthLoadOp;
                }
                else
                {
                    delete unreadonly(depthStencilAttachment).depthLoadOp;
                }
                if (r_canvasRenderPassDescriptor.stencilClearValue !== undefined)
                {
                    hasDepthStencilAttachment = true;
                    reactive(depthStencilAttachment).stencilClearValue = r_canvasRenderPassDescriptor.stencilClearValue;
                }
                else
                {
                    delete unreadonly(depthStencilAttachment).stencilClearValue;
                }
                if (r_canvasRenderPassDescriptor.stencilLoadOp !== undefined)
                {
                    hasDepthStencilAttachment = true;
                    reactive(depthStencilAttachment).stencilLoadOp = r_canvasRenderPassDescriptor.stencilLoadOp;
                }
                else
                {
                    delete unreadonly(depthStencilAttachment).stencilLoadOp;
                }
                if (hasDepthStencilAttachment)
                {
                    reactive(descriptor).depthStencilAttachment = depthStencilAttachment;
                }
                else
                {
                    delete unreadonly(descriptor).depthStencilAttachment;
                }

                if (r_canvasRenderPassDescriptor.depthStoreOp !== undefined)
                {
                    reactive(depthStencilAttachment).depthStoreOp = r_canvasRenderPassDescriptor.depthStoreOp;
                }
                else
                {
                    delete unreadonly(depthStencilAttachment).depthStoreOp;
                }
                if (r_canvasRenderPassDescriptor.depthReadOnly !== undefined)
                {
                    reactive(depthStencilAttachment).depthReadOnly = r_canvasRenderPassDescriptor.depthReadOnly;
                }
                else
                {
                    delete unreadonly(depthStencilAttachment).depthReadOnly;
                }
                if (r_canvasRenderPassDescriptor.stencilStoreOp !== undefined)
                {
                    reactive(depthStencilAttachment).stencilStoreOp = r_canvasRenderPassDescriptor.stencilStoreOp;
                }
                else
                {
                    delete unreadonly(depthStencilAttachment).stencilStoreOp;
                }
                if (r_canvasRenderPassDescriptor.stencilReadOnly !== undefined)
                {
                    reactive(depthStencilAttachment).stencilReadOnly = r_canvasRenderPassDescriptor.stencilReadOnly;
                }
                else
                {
                    delete unreadonly(depthStencilAttachment).stencilReadOnly;
                }

                if (r_canvasRenderPassDescriptor.sampleCount !== undefined)
                {
                    reactive(descriptor).sampleCount = r_canvasRenderPassDescriptor.sampleCount;
                }
                else
                {
                    delete unreadonly(descriptor).sampleCount;
                }

                return descriptor;
            });
        }
    }

    destroy()
    {
        const r_this = reactive(this);

        r_this.device = null;
    }

    submit(submit: Submit)
    {
        const device = this.device;

        runSubmit(device, submit, this._renderPassDescriptorComputed?.value);
    }

    destoryTexture(texture: TextureLike)
    {
        WGPUTextureLike.getInstance(this.device, texture).destroy();
    }

    textureInvertYPremultiplyAlpha(texture: TextureLike, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        const device = this.device;
        const gpuTexture = WGPUTextureLike.getInstance(this.device, texture);

        textureInvertYPremultiplyAlpha(device, gpuTexture.gpuTexture, options);
    }

    copyDepthTexture(sourceTexture: TextureLike, targetTexture: TextureLike)
    {
        const device = this.device;
        const gpuSourceTexture = WGPUTextureLike.getInstance(this.device, sourceTexture);
        const gpuTargetTexture = WGPUTextureLike.getInstance(this.device, targetTexture);

        copyDepthTexture(device, gpuSourceTexture.gpuTexture, gpuTargetTexture.gpuTexture);
    }

    async readPixels(gpuReadPixels: ReadPixels)
    {
        const device = this.device;
        const gpuTexture = WGPUTextureLike.getInstance(this.device, gpuReadPixels.texture);

        const result = await readPixels(device, {
            ...gpuReadPixels,
            texture: gpuTexture.gpuTexture,
        });

        gpuReadPixels.result = result;

        return result;
    }

    async readBuffer(buffer: TypedArray, byteOffset?: GPUSize64, byteLength?: GPUSize64)
    {
        const buffer0 = Buffer.getBuffer(buffer.buffer);

        const commandEncoder = this.device.createCommandEncoder();

        const source = WGPUBuffer.getInstance(this.device, buffer0).gpuBuffer;

        // 创建临时缓冲区，用于读取GPU缓冲区数据
        const destination = this.device.createBuffer({ size: byteLength, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });

        byteOffset = byteOffset ?? buffer.byteOffset;
        byteLength = byteLength ?? buffer.byteLength;

        commandEncoder.copyBufferToBuffer(source, byteOffset, destination, 0, byteLength);

        this.device.queue.submit([commandEncoder.finish()]);

        await destination.mapAsync(GPUMapMode.READ);

        const result = destination.getMappedRange().slice(0);

        destination.unmap();

        // 销毁临时缓冲区
        destination.destroy();

        return result;
    }
}
