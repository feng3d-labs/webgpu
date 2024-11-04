import { getGPUBindGroup } from "./caches/getGPUBindGroup";
import { getGPUBuffer } from "./caches/getGPUBuffer";
import { getGPUComputePipeline } from "./caches/getGPUComputePipeline";
import { getGPURenderPassDescriptor } from "./caches/getGPURenderPassDescriptor";
import { getGPURenderPipeline } from "./caches/getGPURenderPipeline";
import { getGPUTexture } from "./caches/getGPUTexture";
import { getIGPUComputeObject } from "./caches/getIGPUComputeObject";
import { getIGPUCopyBufferToBuffer } from "./caches/getIGPUCopyBufferToBuffer";
import { getIGPUCopyTextureToTexture } from "./caches/getIGPUCopyTextureToTexture";
import { getIGPURenderBundleEncoderDescriptor } from "./caches/getIGPURenderBundleEncoderDescriptor";
import { getIGPURenderObject } from "./caches/getIGPURenderObject";
import { getGPUTextureSize } from "./caches/getIGPUTexture";
import { IGPUCommandEncoder } from "./data/IGPUCommandEncoder";
import { IGPUComputeObject } from "./data/IGPUComputeObject";
import { IGPUComputePass } from "./data/IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "./data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./data/IGPUCopyTextureToTexture";
import { IGPURenderBundleObject } from "./data/IGPURenderBundleObject";
import { IGPURenderObject } from "./data/IGPURenderObject";
import { IGPURenderPass } from "./data/IGPURenderPass";
import { IGPURenderPassDescriptor } from "./data/IGPURenderPassDescriptor";
import { IGPUSubmit } from "./data/IGPUSubmit";
import { IGPUTexture } from "./data/IGPUTexture";
import { copyDepthTexture } from "./utils/copyDepthTexture";
import { readPixels } from "./utils/readPixels";
import { textureInvertYPremultiplyAlpha } from "./utils/textureInvertYPremultiplyAlpha";

/**
 * WebGPU 对象。
 *
 * 提供 `WebGPU` 操作入口 {@link WebGPU.submit}。
 */
export class WebGPU
{
    /**
     * 初始化 WebGPU 获取 GPUDevice 。
     */
    async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        if (!navigator.gpu)
        {
            throw "this browser does not support WebGPU";
        }

        const adapter = await navigator.gpu.requestAdapter(options);
        if (!adapter)
        {
            throw "this browser supports webgpu but it appears disabled";
        }

        const device = await adapter?.requestDevice(descriptor);

        device.lost.then(async (info) =>
        {
            console.error(`WebGPU device was lost: ${info.message}`);

            // 'reason' will be 'destroyed' if we intentionally destroy the device.
            if (info.reason !== "destroyed")
            {
                // try again
                await this.init(options, descriptor);
            }
        });

        this.device = device;

        return this;
    }

    public device: GPUDevice;

    /**
     * 提交 GPU 。
     *
     * @param data 一次 GPU 提交内容。
     *
     * @see GPUQueue.submit
     */
    submit(data: IGPUSubmit)
    {
        const commandBuffers = data.commandEncoders.map((v) =>
        {
            const commandBuffer = this.commandEncode(v);

            return commandBuffer;
        });

        this.device.queue.submit(commandBuffers);
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: IGPUTexture)
    {
        const gpuTexture = getGPUTexture(this.device, texture, false);
        if (gpuTexture)
        {
            gpuTexture.destroy();
        }
    }
    /**
     * 操作纹理进行Y轴翻转或进行预乘Alpha。
     *
     * @param texture 被操作的纹理。
     * @param invertY 是否Y轴翻转
     * @param premultiplyAlpha 是否预乘Alpha。
     */
    textureInvertYPremultiplyAlpha(texture: IGPUTexture, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        const gpuTexture = getGPUTexture(this.device, texture);

        textureInvertYPremultiplyAlpha(this.device, gpuTexture, options);
    }

    /**
     * 拷贝 深度纹理到 普通纹理。
     *
     * @param device GPU设备。
     * @param sourceTexture 源纹理。
     * @param targetTexture 目标纹理。
     */
    copyDepthTexture(sourceTexture: IGPUTexture, targetTexture: IGPUTexture)
    {
        const gpuSourceTexture = getGPUTexture(this.device, sourceTexture);
        const gpuTargetTexture = getGPUTexture(this.device, targetTexture);

        copyDepthTexture(this.device, gpuSourceTexture, gpuTargetTexture);
    }

    /**
     * 从 GPU纹理 上读取数据。
     *
     * @param texture GPU纹理
     * @param x 纹理读取X坐标。
     * @param y 纹理读取Y坐标。
     * @param width 纹理读取宽度。
     * @param height 纹理读取高度。
     *
     * @returns 读取到的数据。
     */
    async readPixels(params: { texture: IGPUTexture, origin: GPUOrigin3D, copySize: { width: number, height: number } })
    {
        const gpuTexture = getGPUTexture(this.device, params.texture, false);

        const result = await readPixels(this.device, {
            ...params,
            texture: gpuTexture,
        });

        return result;
    }

    private commandEncode(v: IGPUCommandEncoder)
    {
        const gpuCommandEncoder = this.device.createCommandEncoder();

        v.passEncoders.forEach((v) =>
        {
            if ((v as IGPURenderPass).descriptor)
            {
                this.renderPass(gpuCommandEncoder, v as IGPURenderPass);
            }
            else if ((v as IGPUComputePass).computeObjects)
            {
                this.computePass(gpuCommandEncoder, v as IGPUComputePass);
            }
            else if ((v as IGPUCopyTextureToTexture).source?.texture)
            {
                v = getIGPUCopyTextureToTexture(v as IGPUCopyTextureToTexture);
                this.copyTextureToTexture(gpuCommandEncoder, v);
            }
            else if ((v as IGPUCopyBufferToBuffer).source?.size)
            {
                v = getIGPUCopyBufferToBuffer(v as IGPUCopyBufferToBuffer);
                this.copyBufferToBuffer(gpuCommandEncoder, v);
            }
            else
            {
                console.error(`未处理 passEncoder`);
            }
        });

        return gpuCommandEncoder.finish();
    }

    private copyBufferToBuffer(commandEncoder: GPUCommandEncoder, v: IGPUCopyBufferToBuffer)
    {
        const sourceBuffer = getGPUBuffer(this.device, v.source);
        const destinationBuffer = getGPUBuffer(this.device, v.destination);

        commandEncoder.copyBufferToBuffer(
            sourceBuffer,
            v.sourceOffset,
            destinationBuffer,
            v.destinationOffset,
            v.size,
        );
    }

    private copyTextureToTexture(commandEncoder: GPUCommandEncoder, v: IGPUCopyTextureToTexture)
    {
        const sourceTexture = getGPUTexture(this.device, v.source.texture);
        const destinationTexture = getGPUTexture(this.device, v.destination.texture);

        commandEncoder.copyTextureToTexture(
            {
                texture: sourceTexture,
            },
            {
                texture: destinationTexture,
            },
            v.copySize,
        );
    }

    private computePass(commandEncoder: GPUCommandEncoder, computePass: IGPUComputePass)
    {
        const passEncoder = commandEncoder.beginComputePass(computePass.descriptor);

        computePass.computeObjects.forEach((computeObject) =>
        {
            this.computePipeline(passEncoder, computeObject);
        });

        passEncoder.end();
    }

    private computePipeline(passEncoder: GPUComputePassEncoder, computeObject: IGPUComputeObject)
    {
        computeObject = getIGPUComputeObject(computeObject)

        const pipeline = getGPUComputePipeline(this.device, computeObject.pipeline);
        passEncoder.setPipeline(pipeline);

        computeObject.bindGroups?.forEach((bindGroup, index) =>
        {
            const gpuBindGroup = getGPUBindGroup(this.device, bindGroup.bindGroup);
            passEncoder.setBindGroup(index, gpuBindGroup, bindGroup.dynamicOffsets);
        });

        const { workgroupCountX, workgroupCountY, workgroupCountZ } = computeObject.workgroups;
        passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
    }

    private renderPass(commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass)
    {
        const renderPassDescriptor = getGPURenderPassDescriptor(this.device, renderPass.descriptor);

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        renderPass.renderObjects?.forEach((element) =>
        {
            if ((element as IGPURenderBundleObject).renderObjects)
            {
                this.executeBundles(passEncoder, renderPass.descriptor, element as IGPURenderBundleObject);
            }
            else
            {
                this.renderObject(passEncoder, element as IGPURenderObject, renderPass.descriptor);
            }
        });

        passEncoder.end();
    }

    private executeBundles(passEncoder: GPURenderPassEncoder, renderPass: IGPURenderPassDescriptor, renderBundleObject: IGPURenderBundleObject)
    {
        let gRenderBundle = renderBundleObject._GPURenderBundle;
        if (!gRenderBundle)
        {
            //
            const renderBundle = getIGPURenderBundleEncoderDescriptor(this.device, renderBundleObject.renderBundle, renderPass);

            const renderBundleEncoder = this.device.createRenderBundleEncoder(renderBundle);

            const renderObjects = renderBundleObject.renderObjects;
            for (let i = 0; i < renderObjects.length; i++)
            {
                this.renderObject(renderBundleEncoder, renderObjects[i], renderPass);
            }

            gRenderBundle = renderBundleEncoder.finish();
            renderBundleObject._GPURenderBundle = gRenderBundle;
        }

        passEncoder.executeBundles([gRenderBundle]);
    }

    private renderObject(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderObject: IGPURenderObject, renderPass: IGPURenderPassDescriptor)
    {
        renderObject = getIGPURenderObject(this.device, renderObject, renderPass);

        const pipeline = getGPURenderPipeline(this.device, renderObject.pipeline);
        passEncoder.setPipeline(pipeline);

        if (renderObject.bindGroups)
        {
            renderObject.bindGroups.forEach((bindGroup, index) =>
            {
                const gBindGroup = getGPUBindGroup(this.device, bindGroup.bindGroup);
                passEncoder.setBindGroup(index, gBindGroup, bindGroup.dynamicOffsets);
            });
        }

        renderObject.vertexBuffers?.forEach((vertexBuffer, index) =>
        {
            const gBuffer = getGPUBuffer(this.device, vertexBuffer.buffer);
            passEncoder.setVertexBuffer(index, gBuffer, vertexBuffer.offset, vertexBuffer.size);
        });

        if (renderObject.index)
        {
            const { buffer, indexFormat, offset, size } = renderObject.index;
            const gBuffer = getGPUBuffer(this.device, buffer);

            passEncoder.setIndexBuffer(gBuffer, indexFormat, offset, size);
        }

        if (renderObject.viewport)
        {
            const { x, y, width, height, minDepth, maxDepth } = renderObject.viewport;
            (passEncoder as GPURenderPassEncoder).setViewport(x, y, width, height, minDepth, maxDepth);
        }

        if (renderObject.scissorRect)
        {
            const { x, y, width, height } = renderObject.scissorRect;
            (passEncoder as GPURenderPassEncoder).setScissorRect(x, y, width, height);
        }

        if (renderObject.draw)
        {
            const { vertexCount, instanceCount, firstVertex, firstInstance } = renderObject.draw;
            passEncoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
        }

        if (renderObject.drawIndexed)
        {
            const { indexCount, instanceCount, firstIndex, baseVertex, firstInstance } = renderObject.drawIndexed;
            passEncoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
        }
    }

    getGPUTextureSize(input: IGPUTexture)
    {
        return getGPUTextureSize(this.device, input);
    }
}
