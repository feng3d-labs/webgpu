import { anyEmitter } from "@feng3d/event";

import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getGPUComputePipeline } from "../caches/getGPUComputePipeline";
import { getGPURenderOcclusionQuery } from "../caches/getGPURenderOcclusionQuery";
import { getGPURenderPassDescriptor } from "../caches/getGPURenderPassDescriptor";
import { getGPURenderPipeline } from "../caches/getGPURenderPipeline";
import { getGPUTexture } from "../caches/getGPUTexture";
import { getIGPUComputePipeline } from "../caches/getIGPUComputePipeline";
import { getIGPURenderPipeline } from "../caches/getIGPURenderPipeline";
import { getGPURenderBundle } from "../data/getGPURenderBundle";
import { getGPURenderPassFormat } from "../data/getGPURenderPassFormats";
import { getIGPUBuffer, getIGPUIndexBuffer } from "../data/getIGPUIndexBuffer";
import { getIGPUSetBindGroups } from "../data/getIGPUSetBindGroups";
import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPUCommandEncoder } from "../data/IGPUCommandEncoder";
import { IGPUComputeObject, IGPUComputePipeline, IGPUWorkgroups } from "../data/IGPUComputeObject";
import { IGPUComputePass } from "../data/IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";
import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPUDraw, IGPUDrawIndexed, IGPURenderObject, IGPURenderPipeline, IGPUSetBindGroup } from "../data/IGPURenderObject";
import { IGPURenderOcclusionQueryObject } from "../data/IGPURenderOcclusionQueryObject";
import { IGPURenderPass, IGPURenderPassObject } from "../data/IGPURenderPass";
import { IGPUScissorRect } from "../data/IGPUScissorRect";
import { IGPUSubmit } from "../data/IGPUSubmit";
import { IGPUVertexAttributes } from "../data/IGPUVertexAttributes";
import { IGPUViewport } from "../data/IGPUViewport";
import { GPUQueue_submit } from "../eventnames";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";

export class RunWebGPU
{
    runSubmit(device: GPUDevice, submit: IGPUSubmit)
    {
        const commandBuffers = submit.commandEncoders.map((v) =>
        {
            const commandBuffer = this.runCommandEncoder(device, v);

            return commandBuffer;
        });

        device.queue.submit(commandBuffers);

        // 派发提交WebGPU事件
        anyEmitter.emit(device.queue, GPUQueue_submit);
    }

    protected runCommandEncoder(device: GPUDevice, commandEncoder: IGPUCommandEncoder)
    {
        const gpuCommandEncoder = device.createCommandEncoder();

        commandEncoder.passEncoders.forEach((passEncoder) =>
        {
            if ((passEncoder as IGPURenderPass).descriptor)
            {
                this.runRenderPass(device, gpuCommandEncoder, passEncoder as IGPURenderPass);
            }
            else if ((passEncoder as IGPUComputePass).computeObjects)
            {
                this.runComputePass(device, gpuCommandEncoder, passEncoder as IGPUComputePass);
            }
            else if ((passEncoder as IGPUCopyTextureToTexture).source?.texture)
            {
                this.runCopyTextureToTexture(device, gpuCommandEncoder, passEncoder as IGPUCopyTextureToTexture);
            }
            else if ((passEncoder as IGPUCopyBufferToBuffer).source)
            {
                this.runCopyBufferToBuffer(device, gpuCommandEncoder, passEncoder as IGPUCopyBufferToBuffer);
            }
            else
            {
                console.error(`未处理 passEncoder`);
            }
        });

        return gpuCommandEncoder.finish();
    }

    protected runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass)
    {
        const { descriptor, renderObjects } = renderPass;

        const renderPassDescriptor = getGPURenderPassDescriptor(device, descriptor);
        const renderPassFormat = getGPURenderPassFormat(descriptor);

        // 处理不被遮挡查询。
        const occlusionQuery = getGPURenderOcclusionQuery(renderObjects);
        occlusionQuery?.init(device, renderPassDescriptor)

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        this.runRenderPassObjects(device, passEncoder, renderPassFormat, renderObjects);

        passEncoder.end();

        //
        occlusionQuery?.queryResult(device, commandEncoder, renderPass);
    }

    protected runRenderPassObjects(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: IGPURenderPassFormat, renderObjects?: IGPURenderPassObject[])
    {
        if (!renderObjects) return;
        //
        renderObjects.forEach((element) =>
        {
            if ((element as IGPURenderOcclusionQueryObject).type === "OcclusionQueryObject")
            {
                this.runRenderOcclusionQueryObject(device, passEncoder, renderPassFormat, element as IGPURenderOcclusionQueryObject);
            }
            else if ((element as IGPUViewport).type === "IGPUViewport")
            {
                this.runViewport(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, element as IGPUViewport);
            }
            else if ((element as IGPUScissorRect).type === "IGPUScissorRect")
            {
                this.runScissorRect(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, element as IGPUScissorRect);
            }
            else if ((element as IGPURenderBundleObject).renderObjects)
            {
                this.runRenderBundle(device, passEncoder, renderPassFormat, element as IGPURenderBundleObject);
            }
            else
            {
                this.runRenderObject(device, passEncoder, renderPassFormat, element as IGPURenderObject);
            }
        });
    }

    protected runRenderBundleObjects(device: GPUDevice, passEncoder: GPURenderBundleEncoder, renderPassFormats: IGPURenderPassFormat, renderObjects?: IGPURenderObject[])
    {
        //
        renderObjects.forEach((element) =>
        {
            this.runRenderObject(device, passEncoder, renderPassFormats, element as IGPURenderObject);
        });
    }

    /**
     * 执行计算通道。
     *
     * @param device GPU设备。
     * @param commandEncoder 命令编码器。
     * @param computePass 计算通道。
     */
    protected runComputePass(device: GPUDevice, commandEncoder: GPUCommandEncoder, computePass: IGPUComputePass)
    {
        const passEncoder = commandEncoder.beginComputePass(computePass.descriptor);

        computePass.computeObjects.forEach((computeObject) =>
        {
            this.runComputeObject(device, passEncoder, computeObject);
        });

        passEncoder.end();
    }

    protected runCopyTextureToTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, copyTextureToTexture: IGPUCopyTextureToTexture)
    {
        const sourceTexture = getGPUTexture(device, copyTextureToTexture.source.texture);
        const destinationTexture = getGPUTexture(device, copyTextureToTexture.destination.texture);

        const source: GPUImageCopyTexture = {
            ...copyTextureToTexture.source,
            texture: sourceTexture,
        };

        const destination: GPUImageCopyTexture = {
            ...copyTextureToTexture.destination,
            texture: destinationTexture,
        };

        commandEncoder.copyTextureToTexture(
            source,
            destination,
            copyTextureToTexture.copySize,
        );
    }

    protected runCopyBufferToBuffer(device: GPUDevice, commandEncoder: GPUCommandEncoder, v: IGPUCopyBufferToBuffer)
    {
        v.sourceOffset ||= 0;
        v.destinationOffset ||= 0;
        v.size ||= v.source.size;

        //
        const sourceBuffer = getGPUBuffer(device, v.source);
        const destinationBuffer = getGPUBuffer(device, v.destination);

        commandEncoder.copyBufferToBuffer(
            sourceBuffer,
            v.sourceOffset,
            destinationBuffer,
            v.destinationOffset,
            v.size,
        );
    }

    protected runRenderOcclusionQueryObject(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormats: IGPURenderPassFormat, renderOcclusionQueryObject: IGPURenderOcclusionQueryObject)
    {
        passEncoder.beginOcclusionQuery(renderOcclusionQueryObject._queryIndex);
        renderOcclusionQueryObject.renderObjects.forEach((renderObject) =>
        {
            this.runRenderObject(device, passEncoder, renderPassFormats, renderObject);
        });
        passEncoder.endOcclusionQuery();
    }

    protected runRenderBundle(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: IGPURenderPassFormat, renderBundleObject: IGPURenderBundleObject)
    {
        const gRenderBundle = getGPURenderBundle(this, device, renderBundleObject, renderPassFormat);

        passEncoder.executeBundles([gRenderBundle]);
    }

    /**
     * 执行计算对象。
     * 
     * @param device GPU设备。
     * @param passEncoder 计算通道编码器。
     * @param computeObject 计算对象。
     */
    protected runComputeObject(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObject: IGPUComputeObject)
    {
        const { pipeline, bindingResources, workgroups } = computeObject;

        this.runComputePipeline(device, passEncoder, pipeline);

        this.runBindingResources(device, passEncoder, pipeline, bindingResources);

        this.runWorkgroups(passEncoder, workgroups);
    }

    protected runComputePipeline(device: GPUDevice, passEncoder: GPUComputePassEncoder, pipeline: IGPUComputePipeline)
    {
        const gpuComputePipeline = getIGPUComputePipeline(pipeline);

        const computePipeline = getGPUComputePipeline(device, gpuComputePipeline);
        passEncoder.setPipeline(computePipeline);
    }

    /**
     * 执行计算工作组。
     * 
     * @param passEncoder 计算通道编码器。 
     * @param workgroups 计算工作组。
     */
    protected runWorkgroups(passEncoder: GPUComputePassEncoder, workgroups?: IGPUWorkgroups)
    {
        const { workgroupCountX, workgroupCountY, workgroupCountZ } = workgroups;
        passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
    }

    /**
     * 执行渲染对象。
     * 
     * @param device GPU设备。
     * @param passEncoder 渲染通道编码器。
     * @param renderObject 渲染对象。
     * @param renderPass 渲染通道。
     */
    protected runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObject: IGPURenderObject)
    {
        const { pipeline, vertices, indices, bindingResources, draw, drawIndexed } = renderObject;

        this.runRenderPipeline(device, passEncoder, pipeline, renderPassFormat, vertices);

        this.runBindingResources(device, passEncoder, pipeline, bindingResources);

        this.runVertices(device, passEncoder, pipeline, renderPassFormat, vertices);

        this.runIndices(device, passEncoder, indices);

        this.runDraw(passEncoder, draw);

        this.runDrawIndexed(passEncoder, drawIndexed);
    }

    protected runViewport(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, viewport?: IGPUViewport)
    {
        if (!viewport) return;

        let { fromWebGL, x, y, width, height, minDepth, maxDepth } = viewport;
        if (fromWebGL)
        {
            y = attachmentSize.height - y - height
        }
        passEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
    }

    protected runScissorRect(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, scissorRect?: IGPUScissorRect)
    {
        if (!scissorRect) return;

        let { fromWebGL, x, y, width, height } = scissorRect;
        if (fromWebGL)
        {
            y = attachmentSize.height - y - height
        }

        passEncoder.setScissorRect(x, y, width, height);
    }

    /**
     * 执行渲染管线。
     * 
     * @param device GPU设备。
     * @param passEncoder 渲染通道编码器。
     * @param pipeline 渲染管线。
     */
    protected runRenderPipeline(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPipeline: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IGPUVertexAttributes)
    {
        const { pipeline } = getIGPURenderPipeline(renderPipeline, renderPassFormat, vertices);

        const gpuRenderPipeline = getGPURenderPipeline(device, pipeline);
        passEncoder.setPipeline(gpuRenderPipeline);
    }

    protected runBindingResources(device: GPUDevice, passEncoder: GPUBindingCommandsMixin, pipeline: IGPUComputePipeline | IGPURenderPipeline, bindingResources: IGPUBindingResources)
    {
        // 计算 bindGroups
        const setBindGroups = getIGPUSetBindGroups(pipeline, bindingResources);

        setBindGroups?.forEach((setBindGroup, index) =>
        {
            this.runSetBindGroup(device, passEncoder, index, setBindGroup);
        });
    }

    protected runSetBindGroup(device: GPUDevice, passEncoder: GPUBindingCommandsMixin, index: number, setBindGroup: IGPUSetBindGroup)
    {
        const gpuBindGroup = getGPUBindGroup(device, setBindGroup.bindGroup);
        passEncoder.setBindGroup(index, gpuBindGroup, setBindGroup.dynamicOffsets);
    }

    protected runVertices(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPipeline: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IGPUVertexAttributes)
    {
        if (!vertices) return;

        const { vertexBuffers } = getIGPURenderPipeline(renderPipeline, renderPassFormat, vertices);

        vertexBuffers?.forEach((vertexBuffer, index) =>
        {
            const buffer = getIGPUBuffer(vertexBuffer.data);
            buffer.label = buffer.label || ("顶点索引 " + autoVertexIndex++);
            const gBuffer = getGPUBuffer(device, buffer);
            passEncoder.setVertexBuffer(index, gBuffer, vertexBuffer.offset, vertexBuffer.size);
        });
    }

    protected runIndices(device: GPUDevice, passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, indices: Uint16Array | Uint32Array)
    {
        if (!indices) return;

        const indexBuffer = getIGPUIndexBuffer(indices);

        const { buffer, indexFormat, offset, size } = indexBuffer;
        const gBuffer = getGPUBuffer(device, buffer);

        passEncoder.setIndexBuffer(gBuffer, indexFormat, offset, size);
    }

    protected runDraw(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, draw?: IGPUDraw)
    {
        if (!draw) return;

        const { vertexCount, instanceCount, firstVertex, firstInstance } = draw;
        passEncoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }

    protected runDrawIndexed(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, drawIndexed?: IGPUDrawIndexed)
    {
        if (!drawIndexed) return;

        const { indexCount, instanceCount, firstIndex, baseVertex, firstInstance } = drawIndexed;
        passEncoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
}

let autoVertexIndex = 0;
