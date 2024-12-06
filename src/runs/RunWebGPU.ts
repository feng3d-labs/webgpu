import { anyEmitter } from "@feng3d/event";

import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getGPUComputePipeline } from "../caches/getGPUComputePipeline";
import { getGPURenderOcclusionQuery } from "../caches/getGPURenderOcclusionQuery";
import { getGPURenderPassDescriptor } from "../caches/getGPURenderPassDescriptor";
import { getGPURenderPassFormat } from "../caches/getGPURenderPassFormat";
import { getGPURenderPipeline } from "../caches/getGPURenderPipeline";
import { getGPURenderTimestampQuery } from "../caches/getGPURenderTimestampQuery";
import { getGPUTexture } from "../caches/getGPUTexture";
import { getIGPUBuffer } from "../caches/getIGPUBuffer";
import { getIGPUComputePipeline } from "../caches/getIGPUComputePipeline";
import { getIGPUSetBindGroups } from "../caches/getIGPUSetBindGroups";
import { getNGPURenderPipeline } from "../caches/getNGPURenderPipeline";
import { getRealGPUBindGroup } from "../const";
import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPUBlendConstant } from "../data/IGPUBlendConstant";
import { IGPUCommandEncoder } from "../data/IGPUCommandEncoder";
import { IGPUComputeObject } from "../data/IGPUComputeObject";
import { IGPUComputePass } from "../data/IGPUComputePass";
import { IGPUComputePipeline } from "../data/IGPUComputePipeline";
import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";
import { IGPUDrawIndexed } from "../data/IGPUDrawIndexed";
import { IGPUDrawVertex } from "../data/IGPUDrawVertex";
import { IGPUOcclusionQuery } from "../data/IGPUOcclusionQuery";
import { IGPURenderBundle } from "../data/IGPURenderBundle";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPass, IGPURenderPassObject } from "../data/IGPURenderPass";
import { IGPURenderPipeline } from "../data/IGPURenderPipeline";
import { IGPUScissorRect } from "../data/IGPUScissorRect";
import { IGPUStencilReference } from "../data/IGPUStencilReference";
import { IGPUSubmit } from "../data/IGPUSubmit";
import { IGPUVertexAttributes } from "../data/IGPUVertexAttributes";
import { IGPUViewport } from "../data/IGPUViewport";
import { IGPUWorkgroups } from "../data/IGPUWorkgroups";
import { GPUQueue_submit } from "../eventnames";
import { getIGPUIndexBuffer } from "../internal/getIGPUIndexBuffer";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { IGPUSetBindGroup } from "../internal/IGPUSetBindGroup";
import { ChainMap } from "../utils/ChainMap";

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
            if (!passEncoder.__type)
            {
                this.runRenderPass(device, gpuCommandEncoder, passEncoder as IGPURenderPass);
            }
            else if (passEncoder.__type === "RenderPass")
            {
                this.runRenderPass(device, gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type === "ComputePass")
            {
                this.runComputePass(device, gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type === "CopyTextureToTexture")
            {
                this.runCopyTextureToTexture(device, gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type === "CopyBufferToBuffer")
            {
                this.runCopyBufferToBuffer(device, gpuCommandEncoder, passEncoder);
            }
            else
            {
                console.error(`未处理 passEncoder ${passEncoder}`);
            }
        });

        return gpuCommandEncoder.finish();
    }

    protected runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass)
    {
        const { descriptor, renderObjects } = renderPass;

        const renderPassDescriptor = getGPURenderPassDescriptor(device, descriptor);
        const renderPassFormat = getGPURenderPassFormat(descriptor);

        // 处理时间戳查询
        const timestampQuery = getGPURenderTimestampQuery(device, renderPass.timestampQuery);
        timestampQuery.init(device, renderPassDescriptor);

        // 处理不被遮挡查询。
        const occlusionQuery = getGPURenderOcclusionQuery(renderObjects);
        occlusionQuery.init(device, renderPassDescriptor);

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        this.runRenderPassObjects(device, passEncoder, renderPassFormat, renderObjects);

        passEncoder.end();

        // 处理不被遮挡查询。
        occlusionQuery.resolve(device, commandEncoder, renderPass);

        // 处理时间戳查询
        timestampQuery.resolve(device, commandEncoder, renderPass);
    }

    protected runRenderPassObjects(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: IGPURenderPassFormat, renderObjects?: readonly IGPURenderPassObject[])
    {
        if (!renderObjects) return;
        //
        renderObjects.forEach((element) =>
        {
            if (!element.__type)
            {
                this.runRenderObject(device, passEncoder, renderPassFormat, element as IGPURenderObject);
            }
            else if (element.__type === "RenderObject")
            {
                this.runRenderObject(device, passEncoder, renderPassFormat, element);
            }
            else if (element.__type === "Viewport")
            {
                this.runViewport(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, element);
            }
            else if (element.__type === "ScissorRect")
            {
                this.runScissorRect(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, element);
            }
            else if (element.__type === "RenderBundle")
            {
                this.runRenderBundle(device, passEncoder, renderPassFormat, element);
            }
            else if (element.__type === "OcclusionQuery")
            {
                this.runRenderOcclusionQueryObject(device, passEncoder, renderPassFormat, element);
            }
            else if (element.__type === "BlendConstant")
            {
                this.runBlendConstant(passEncoder, element);
            }
            else if (element.__type === "StencilReference")
            {
                this.runStencilReference(passEncoder, element);
            }
            else
            {
                throw `未处理 ${(element as IGPURenderPassObject).__type} 类型的渲染通道对象！`;
            }
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
        const descriptor: GPUComputePassDescriptor = {};
        // 处理时间戳查询
        const timestampQuery = getGPURenderTimestampQuery(device, computePass?.timestampQuery);
        timestampQuery.init(device, descriptor);

        const passEncoder = commandEncoder.beginComputePass(descriptor);

        this.runComputeObjects(device, passEncoder, computePass.computeObjects);

        passEncoder.end();

        // 处理时间戳查询
        timestampQuery.resolve(device, commandEncoder, computePass);
    }

    protected runComputeObjects(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObjects: IGPUComputeObject[])
    {
        computeObjects.forEach((computeObject) =>
        {
            this.runComputeObject(device, passEncoder, computeObject);
        });
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

    protected runRenderOcclusionQueryObject(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: IGPURenderPassFormat, renderOcclusionQueryObject: IGPUOcclusionQuery)
    {
        passEncoder.beginOcclusionQuery(renderOcclusionQueryObject._queryIndex);
        renderOcclusionQueryObject.renderObjects.forEach((renderObject) =>
        {
            this.runRenderObject(device, passEncoder, renderPassFormat, renderObject);
        });
        passEncoder.endOcclusionQuery();
    }

    protected runRenderBundle(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: IGPURenderPassFormat, renderBundleObject: IGPURenderBundle)
    {
        const renderBundleMap: ChainMap<[IGPURenderBundle, string], GPURenderBundle> = device["_renderBundleMap"] = device["_renderBundleMap"] || new ChainMap();
        //
        let gpuRenderBundle: GPURenderBundle = renderBundleMap.get([renderBundleObject, renderPassFormat._key]);
        if (!gpuRenderBundle)
        {
            const descriptor: GPURenderBundleEncoderDescriptor = { ...renderBundleObject.descriptor, ...renderPassFormat };

            //
            const renderBundleEncoder = device.createRenderBundleEncoder(descriptor);

            this.runRenderBundleObjects(device, renderBundleEncoder, renderPassFormat, renderBundleObject.renderObjects);

            gpuRenderBundle = renderBundleEncoder.finish();
            renderBundleMap.set([renderBundleObject, renderPassFormat._key], gpuRenderBundle);
        }

        passEncoder.executeBundles([gpuRenderBundle]);
    }

    protected runRenderBundleObjects(device: GPUDevice, passEncoder: GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObjects?: readonly IGPURenderObject[])
    {
        //
        renderObjects.forEach((element) =>
        {
            this.runRenderObject(device, passEncoder, renderPassFormat, element as IGPURenderObject);
        });
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
        const { pipeline, vertices, indices, bindingResources, drawVertex, drawIndexed } = renderObject;

        this.runRenderPipeline(device, passEncoder, pipeline, renderPassFormat, vertices);

        this.runBindingResources(device, passEncoder, pipeline, bindingResources);

        this.runVertices(device, passEncoder, pipeline, renderPassFormat, vertices);

        this.runIndices(device, passEncoder, indices);

        this.runDrawVertex(passEncoder, drawVertex);

        this.runDrawIndexed(passEncoder, drawIndexed);
    }

    protected runBlendConstant(passEncoder: GPURenderPassEncoder, element: IGPUBlendConstant)
    {
        passEncoder.setBlendConstant(element.color);
    }

    protected runStencilReference(passEncoder: GPURenderPassEncoder, element: IGPUStencilReference)
    {
        passEncoder.setStencilReference(element.reference);
    }

    protected runViewport(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, viewport: IGPUViewport)
    {
        const { fromWebGL, x, width, height, minDepth, maxDepth } = viewport;
        let { y } = viewport;
        if (fromWebGL)
        {
            y = attachmentSize.height - y - height;
        }
        passEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
    }

    protected runScissorRect(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, scissorRect: IGPUScissorRect)
    {
        const { fromWebGL, x, width, height } = scissorRect;
        let { y } = scissorRect;
        if (fromWebGL)
        {
            y = attachmentSize.height - y - height;
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
        const { pipeline } = getNGPURenderPipeline(renderPipeline, renderPassFormat, vertices);

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
        const gpuBindGroup = getGPUBindGroup(device, setBindGroup.bindGroup)[getRealGPUBindGroup]();
        passEncoder.setBindGroup(index, gpuBindGroup, setBindGroup.dynamicOffsets);
    }

    protected runVertices(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPipeline: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IGPUVertexAttributes)
    {
        if (!vertices) return;

        const { vertexBuffers } = getNGPURenderPipeline(renderPipeline, renderPassFormat, vertices);

        vertexBuffers?.forEach((vertexBuffer, index) =>
        {
            const buffer = getIGPUBuffer(vertexBuffer.data);
            (buffer as any).label = buffer.label || (`顶点属性 ${autoVertexIndex++}`);
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

    protected runDrawVertex(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, draw?: IGPUDrawVertex)
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
