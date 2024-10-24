import { getGPUBindGroup } from "./caches/getGPUBindGroup";
import { getGPUBuffer } from "./caches/getGPUBuffer";
import { getGPUComputePipeline } from "./caches/getGPUComputePipeline";
import { getGPURenderPassDescriptor } from "./caches/getGPURenderPassDescriptor";
import { getGPURenderPipeline } from "./caches/getGPURenderPipeline";
import { getGPUTexture } from "./caches/getGPUTexture";
import { getIGPURenderObject } from "./caches/getIGPURenderObject";
import { getGPURenderBundleEncoderDescriptor, getIComputePassEncoder, getIGPUCopyBufferToBuffer, getIGPUCopyTextureToTexture } from "./caches/getIGPUSubmit";
import { getGPUTextureSize } from "./caches/getIGPUTexture";
import { IGPUCommandEncoder } from "./data/IGPUCommandEncoder";
import { IGPUComputeObject } from "./data/IGPUComputeObject";
import { IGPUComputePassEncoder } from "./data/IGPUComputePassEncoder";
import { IGPUCopyBufferToBuffer } from "./data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./data/IGPUCopyTextureToTexture";
import { IGPURenderBundleObject } from "./data/IGPURenderBundleObject";
import { IGPURenderObject } from "./data/IGPURenderObject";
import { IGPURenderPassDescriptor, IGPURenderPassEncoder } from "./data/IGPURenderPassEncoder";
import { IGPUSubmit } from "./data/IGPUSubmit";
import { IGPUCanvasContext, IGPUTexture } from "./data/IGPUTexture";
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
     * 默认画布。
     */
    private _context: IGPUCanvasContext;

    /**
     * 使用方法前需要调用init进行初始化。
     *
     * 建议使用 `const webgpu = await new WebGPU().init();` 进行初始化。
     *
     * @param options
     */
    constructor(context?: IGPUCanvasContext)
    {
        this._context = context;
    }

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
     * 单独执行渲染通道。
     *
     * @param renderPassEncoder 渲染通道对象。
     */
    runRenderPass(renderPassEncoder: IGPURenderPassEncoder)
    {
        // 设置默认画布。
        renderPassEncoder.descriptor.colorAttachments.forEach((v) =>
        {
            if (!v.view)
            {
                v.view = { texture: { context: this._context } };
            }
        });

        //
        this.submit({
            commandEncoders: [{
                passEncoders: [renderPassEncoder],
            }],
        });
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

        const commands = [];

        v.passEncoders.forEach((v) =>
        {
            if (isRenderPass(v))
            {
                this.renderPass(gpuCommandEncoder, v, commands);
            }
            else if (isComputePass(v))
            {
                v = getIComputePassEncoder(v);
                this.computePass(gpuCommandEncoder, v, commands);
            }
            else if (isCopyTextureToTexture(v))
            {
                v = getIGPUCopyTextureToTexture(v);
                this.copyTextureToTexture(gpuCommandEncoder, v, commands);
            }
            else if (isCopyBufferToBuffer(v))
            {
                v = getIGPUCopyBufferToBuffer(v);
                this.copyBufferToBuffer(gpuCommandEncoder, v, commands);
            }
            else
            {
                console.error(`未处理 passEncoder`);
            }
        });

        commands.push(["finish"]);

        return gpuCommandEncoder.finish();
    }

    private copyBufferToBuffer(commandEncoder: GPUCommandEncoder, v: IGPUCopyBufferToBuffer, commands: any[])
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
        commands.push(["copyBufferToBuffer",
            sourceBuffer,
            v.sourceOffset,
            destinationBuffer,
            v.destinationOffset,
            v.size
        ]);
    }

    private copyTextureToTexture(commandEncoder: GPUCommandEncoder, v: IGPUCopyTextureToTexture, commands: any[])
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
        commands.push(["copyTextureToTexture",
            {
                texture: sourceTexture,
            },
            {
                texture: destinationTexture,
            },
            v.copySize],
        );
    }

    private computePass(commandEncoder: GPUCommandEncoder, v: IGPUComputePassEncoder, commands: any[])
    {
        const passEncoder = commandEncoder.beginComputePass(v.computePass);
        commands.push(["beginComputePass", v.computePass]);

        v.computeObjects.forEach((p) =>
        {
            this.computePipeline(passEncoder, p, commands);
        });

        passEncoder.end();
        commands.push(["end"]);
    }

    private computePipeline(passEncoder: GPUComputePassEncoder, p: IGPUComputeObject, commands: any[])
    {
        const pipeline = getGPUComputePipeline(this.device, p.pipeline);
        passEncoder.setPipeline(pipeline);
        commands.push(["setPipeline", pipeline]);

        if (p.bindGroups)
        {
            p.bindGroups.forEach((bindGroup, index) =>
            {
                const gpuBindGroup = getGPUBindGroup(this.device, bindGroup.bindGroup);
                passEncoder.setBindGroup(index, gpuBindGroup, bindGroup.dynamicOffsets);

                commands.push(["setBindGroup", index, gpuBindGroup, bindGroup.dynamicOffsets]);
            });
        }

        const { workgroupCountX, workgroupCountY, workgroupCountZ } = p.workgroups;
        passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
        commands.push(["dispatchWorkgroups", workgroupCountX, workgroupCountY, workgroupCountZ]);
    }

    private renderPass(commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPassEncoder, commands: any[])
    {
        const renderPassDescriptor = getGPURenderPassDescriptor(this.device, renderPass.descriptor);

        commands.push(["beginRenderPass", renderPassDescriptor]);

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder["_bindGroups"] = [];
        passEncoder["_vertexBuffers"] = [];

        renderPass.renderObjects?.forEach((element) =>
        {
            if (isRenderBundle(element))
            {
                this.executeBundles(passEncoder, renderPass.descriptor, element, commands);
            }
            else
            {
                this.renderObject(passEncoder, element, renderPass.descriptor, commands);
            }
        });

        commands.push(["end"]);

        passEncoder.end();
    }

    private executeBundles(passEncoder: GPURenderPassEncoder, renderPass: IGPURenderPassDescriptor, renderBundleObject: IGPURenderBundleObject, commands: any[])
    {
        let gRenderBundle = renderBundleObject._GPURenderBundle;
        if (!gRenderBundle)
        {
            //
            const renderBundle = getGPURenderBundleEncoderDescriptor(this.device, renderBundleObject.renderBundle, renderPass);

            const renderBundleEncoder = this.device.createRenderBundleEncoder(renderBundle);
            renderBundleEncoder["_bindGroups"] = [];
            renderBundleEncoder["_vertexBuffers"] = [];

            const renderObjects = renderBundleObject.renderObjects;
            for (let i = 0; i < renderObjects.length; i++)
            {
                this.renderObject(renderBundleEncoder, renderObjects[i], renderPass, []);
            }

            gRenderBundle = renderBundleEncoder.finish();
            renderBundleObject._GPURenderBundle = gRenderBundle;
        }

        commands.push(["executeBundles", [gRenderBundle]]);

        passEncoder.executeBundles([gRenderBundle]);
    }

    private renderObject(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderObject: IGPURenderObject, renderPass: IGPURenderPassDescriptor, commands: any[])
    {
        renderObject = getIGPURenderObject(this.device, renderObject, renderPass);

        if (passEncoder["_pipeline"] !== renderObject.pipeline)
        {
            passEncoder["_pipeline"] = renderObject.pipeline;
            //
            const pipeline = getGPURenderPipeline(this.device, renderObject.pipeline);
            passEncoder.setPipeline(pipeline);

            commands.push("setPipeline", pipeline);
        }

        if (renderObject.bindGroups)
        {
            renderObject.bindGroups.forEach((bindGroup, index) =>
            {
                if (passEncoder["_bindGroups"][index] === bindGroup) return;
                passEncoder["_bindGroups"][index] = bindGroup;

                const gBindGroup = getGPUBindGroup(this.device, bindGroup.bindGroup);
                passEncoder.setBindGroup(index, gBindGroup, bindGroup.dynamicOffsets);

                commands.push("setBindGroup", index, gBindGroup, bindGroup.dynamicOffsets);
            });
        }

        if (renderObject.vertexBuffers)
        {
            renderObject.vertexBuffers.forEach((vertexBuffer, index) =>
            {
                if (passEncoder["_vertexBuffers"][index] === vertexBuffer) return;
                passEncoder["_vertexBuffers"][index] = vertexBuffer;

                const gBuffer = getGPUBuffer(this.device, vertexBuffer.buffer);
                passEncoder.setVertexBuffer(index, gBuffer, vertexBuffer.offset, vertexBuffer.size);

                commands.push("setVertexBuffer", index, gBuffer, vertexBuffer.offset, vertexBuffer.size);
            });
        }

        if (renderObject.index)
        {
            if (passEncoder["_indexBuffer"] !== renderObject.index)
            {
                passEncoder["_indexBuffer"] = renderObject.index;

                const { buffer, indexFormat, offset, size } = renderObject.index;
                const gBuffer = getGPUBuffer(this.device, buffer);

                passEncoder.setIndexBuffer(gBuffer, indexFormat, offset, size);

                commands.push("setIndexBuffer", gBuffer, indexFormat, offset, size);
            }
        }

        if (renderObject.viewport)
        {
            if (passEncoder["_viewport"] !== renderObject.viewport)
            {
                passEncoder["_viewport"] = renderObject.viewport;

                const { x, y, width, height, minDepth, maxDepth } = renderObject.viewport;
                (passEncoder as GPURenderPassEncoder).setViewport(x, y, width, height, minDepth, maxDepth);

                commands.push("setViewport", x, y, width, height, minDepth, maxDepth);
            }
        }

        if (renderObject.scissorRect)
        {
            if (passEncoder["_scissorRect"] !== renderObject.scissorRect)
            {
                passEncoder["_scissorRect"] = renderObject.scissorRect;

                const { x, y, width, height } = renderObject.scissorRect;
                (passEncoder as GPURenderPassEncoder).setScissorRect(x, y, width, height);

                commands.push("setScissorRect", x, y, width, height);
            }
        }

        if (renderObject.draw)
        {
            const { vertexCount, instanceCount, firstVertex, firstInstance } = renderObject.draw;
            passEncoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);

            commands.push("draw", vertexCount, instanceCount, firstVertex, firstInstance);
        }

        if (renderObject.drawIndexed)
        {
            const { indexCount, instanceCount, firstIndex, baseVertex, firstInstance } = renderObject.drawIndexed;
            passEncoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);

            commands.push("drawIndexed", indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
        }
    }

    getGPUTextureSize(input: IGPUTexture)
    {
        return getGPUTextureSize(this.device, input);
    }
}

function isRenderPass(arg: any): arg is IGPURenderPassEncoder
{
    return !!(arg as IGPURenderPassEncoder).descriptor;
}

function isComputePass(arg: any): arg is IGPUComputePassEncoder
{
    return !!(arg as IGPUComputePassEncoder).computeObjects;
}

function isRenderBundle(arg: IGPURenderObject | IGPURenderBundleObject): arg is IGPURenderBundleObject
{
    return !!(arg as IGPURenderBundleObject).renderObjects;
}

function isCopyTextureToTexture(arg: any): arg is IGPUCopyTextureToTexture
{
    return !!(arg as IGPUCopyTextureToTexture).source?.texture;
}

function isCopyBufferToBuffer(arg: any): arg is IGPUCopyBufferToBuffer
{
    return !!(arg as IGPUCopyBufferToBuffer).source?.size;
}
