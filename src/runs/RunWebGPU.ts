import { anyEmitter } from "@feng3d/event";
import { CommandEncoder, CopyBufferToBuffer, CopyTextureToTexture, GBuffer, IIndicesDataTypes, OcclusionQuery, PrimitiveState, RenderObject, RenderPass, RenderPassObject, RenderPipeline, ScissorRect, Submit, UnReadonly, VertexAttributes, Viewport } from "@feng3d/render-api";

import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getGPUComputePipeline } from "../caches/getGPUComputePipeline";
import { getGPUPipelineLayout, IGPUShader } from "../caches/getGPUPipelineLayout";
import { getGPURenderOcclusionQuery, GPURenderOcclusionQuery } from "../caches/getGPURenderOcclusionQuery";
import { getGPURenderPassDescriptor } from "../caches/getGPURenderPassDescriptor";
import { getGPURenderPassFormat } from "../caches/getGPURenderPassFormat";
import { getGPURenderPipeline } from "../caches/getGPURenderPipeline";
import { getGPURenderTimestampQuery } from "../caches/getGPURenderTimestampQuery";
import { getGPUTexture } from "../caches/getGPUTexture";
import { getGBuffer } from "../caches/getIGPUBuffer";
import { getNGPURenderPipeline } from "../caches/getNGPURenderPipeline";
import { getRealGPUBindGroup } from "../const";
import { ComputeObject } from "../data/ComputeObject";
import { ComputePass } from "../data/ComputePass";
import "../data/polyfills/RenderObject";
import "../data/polyfills/RenderPass";
import { RenderBundle } from "../data/RenderBundle";
import { GPUQueue_submit } from "../eventnames";
import { RenderPassFormat } from "../internal/RenderPassFormat";
import { ChainMap } from "../utils/ChainMap";

export class RunWebGPU
{

    runSubmit(device: GPUDevice, submit: Submit)
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

    protected runCommandEncoder(device: GPUDevice, commandEncoder: CommandEncoder)
    {
        const gpuCommandEncoder = device.createCommandEncoder();

        commandEncoder.passEncoders.forEach((passEncoder) =>
        {
            if (!passEncoder.__type__)
            {
                this.runRenderPass(device, gpuCommandEncoder, passEncoder as RenderPass);
            }
            else if (passEncoder.__type__ === "RenderPass")
            {
                this.runRenderPass(device, gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type__ === "ComputePass")
            {
                this.runComputePass(device, gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type__ === "CopyTextureToTexture")
            {
                this.runCopyTextureToTexture(device, gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type__ === "CopyBufferToBuffer")
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

    protected runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass)
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

        this.runRenderPassObjects(device, passEncoder, renderPassFormat, renderObjects, occlusionQuery);

        passEncoder.end();

        // 处理不被遮挡查询。
        occlusionQuery.resolve(device, commandEncoder, renderPass);

        // 处理时间戳查询
        timestampQuery.resolve(device, commandEncoder, renderPass);
    }

    protected runRenderPassObjects(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: RenderPassFormat, renderObjects: readonly RenderPassObject[], occlusionQuery: GPURenderOcclusionQuery)
    {
        if (!renderObjects) return;
        //
        renderObjects.forEach((element) =>
        {
            if (!element.__type__)
            {
                this.runRenderObject(device, passEncoder, renderPassFormat, element as RenderObject);
            }
            else if (element.__type__ === "RenderObject")
            {
                this.runRenderObject(device, passEncoder, renderPassFormat, element);
            }
            else if (element.__type__ === "RenderBundle")
            {
                this.runRenderBundle(device, passEncoder, renderPassFormat, element);
            }
            else if (element.__type__ === "OcclusionQuery")
            {
                this.runRenderOcclusionQueryObject(device, passEncoder, renderPassFormat, element, occlusionQuery);
            }
            else
            {
                throw `未处理 ${(element as RenderPassObject).__type__} 类型的渲染通道对象！`;
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
    protected runComputePass(device: GPUDevice, commandEncoder: GPUCommandEncoder, computePass: ComputePass)
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

    protected runComputeObjects(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObjects: ComputeObject[])
    {
        computeObjects.forEach((computeObject) =>
        {
            this.runComputeObject(device, passEncoder, computeObject);
        });
    }

    protected runCopyTextureToTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, copyTextureToTexture: CopyTextureToTexture)
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

    protected runCopyBufferToBuffer(device: GPUDevice, commandEncoder: GPUCommandEncoder, v: CopyBufferToBuffer)
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

    protected runRenderOcclusionQueryObject(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: RenderPassFormat, renderOcclusionQueryObject: OcclusionQuery, occlusionQuery: GPURenderOcclusionQuery)
    {
        passEncoder.beginOcclusionQuery(occlusionQuery.getQueryIndex(renderOcclusionQueryObject));

        renderOcclusionQueryObject.renderObjects.forEach((renderObject) =>
        {
            this.runRenderObject(device, passEncoder, renderPassFormat, renderObject);
        });

        passEncoder.endOcclusionQuery();
    }

    protected runRenderBundle(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: RenderPassFormat, renderBundleObject: RenderBundle)
    {
        const renderBundleMap: ChainMap<[RenderBundle, string], GPURenderBundle> = device["_renderBundleMap"] = device["_renderBundleMap"] || new ChainMap();
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

    protected runRenderBundleObjects(device: GPUDevice, passEncoder: GPURenderBundleEncoder, renderPassFormat: RenderPassFormat, renderObjects?: readonly RenderObject[])
    {
        //
        renderObjects.forEach((element) =>
        {
            this.runRenderObject(device, passEncoder, renderPassFormat, element as RenderObject);
        });
    }

    /**
     * 执行计算对象。
     *
     * @param device GPU设备。
     * @param passEncoder 计算通道编码器。
     * @param computeObject 计算对象。
     */
    protected runComputeObject(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObject: ComputeObject)
    {
        const { pipeline: pipeline, uniforms: bindingResources, workgroups } = computeObject;

        const shader: IGPUShader = { compute: pipeline.compute.code };

        const computePipeline = getGPUComputePipeline(device, pipeline);
        passEncoder.setPipeline(computePipeline);

        // 计算 bindGroups
        const layout = getGPUPipelineLayout(device, shader);
        layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
        {
            const gpuBindGroup: GPUBindGroup = getGPUBindGroup(device, bindGroupLayout, bindingResources)[getRealGPUBindGroup]();
            passEncoder.setBindGroup(group, gpuBindGroup);
        });

        passEncoder.dispatchWorkgroups(workgroups.workgroupCountX, workgroups.workgroupCountY, workgroups.workgroupCountZ);
    }

    /**
     * 执行渲染对象。
     *
     * @param device GPU设备。
     * @param passEncoder 渲染通道编码器。
     * @param renderObject 渲染对象。
     * @param renderPass 渲染通道。
     */
    protected runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: RenderPassFormat, renderObject: RenderObject)
    {
        const { viewport, scissorRect, pipeline, bindingResources: bindingResources, geometry } = renderObject;

        const shader: IGPUShader = { vertex: pipeline.vertex.code, fragment: pipeline.fragment?.code };

        if ("setViewport" in passEncoder)
        {
            this.runViewport(passEncoder, renderPassFormat.attachmentSize, viewport);
        }
        if ("setScissorRect" in passEncoder)
        {
            this.runScissorRect(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, scissorRect);
        }

        const { primitive, vertices, indices, draw } = geometry;

        this.runRenderPipeline(device, passEncoder, renderPassFormat, pipeline, primitive, vertices, indices);

        // 计算 bindGroups
        const layout = getGPUPipelineLayout(device, shader);
        layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
        {
            const gpuBindGroup: GPUBindGroup = getGPUBindGroup(device, bindGroupLayout, bindingResources)[getRealGPUBindGroup]();
            passEncoder.setBindGroup(group, gpuBindGroup);
        });

        const renderPipeline = getNGPURenderPipeline(pipeline, renderPassFormat, primitive, vertices, indices);

        //
        renderPipeline.vertexBuffers?.forEach((vertexBuffer, index) =>
        {
            const buffer = getGBuffer(vertexBuffer.data);
            (buffer as any).label = buffer.label || (`顶点属性 ${autoVertexIndex++}`);

            const gBuffer = getGPUBuffer(device, buffer);

            passEncoder.setVertexBuffer(index, gBuffer, vertexBuffer.offset, vertexBuffer.size);
        });

        if (indices)
        {
            const buffer = getGBuffer(indices);
            (buffer as UnReadonly<GBuffer>).label = buffer.label || (`顶点索引 ${autoIndex++}`);

            const gBuffer = getGPUBuffer(device, buffer);

            //
            passEncoder.setIndexBuffer(gBuffer, indices.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16", indices.byteOffset, indices.byteLength);
        }

        if (draw.__type__ === 'DrawVertex')
        {
            passEncoder.draw(draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance);
        }
        else
        {
            passEncoder.drawIndexed(draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance);
        }
    }

    protected runRenderPipeline(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: RenderPassFormat, pipeline: RenderPipeline, primitive: PrimitiveState, vertices: VertexAttributes, indices: IIndicesDataTypes)
    {
        //
        const renderPipelineResult = getNGPURenderPipeline(pipeline, renderPassFormat, primitive, vertices, indices);

        const nPipeline = renderPipelineResult.pipeline;

        const gpuRenderPipeline = getGPURenderPipeline(device, nPipeline);

        //
        passEncoder.setPipeline(gpuRenderPipeline);

        // 设置模板测试替换值
        if (nPipeline.stencilReference !== undefined)
        {
            if ("setStencilReference" in passEncoder)
            {
                passEncoder.setStencilReference(nPipeline.stencilReference);
            }
            else
            {
                console.warn(`不支持在 ${passEncoder.constructor.name} 中设置 stencilReference 值！`);
            }
        }

        if (nPipeline.blendConstantColor !== undefined)
        {
            if ("setBlendConstant" in passEncoder)
            {
                passEncoder.setBlendConstant(nPipeline.blendConstantColor);
            }
            else
            {
                console.warn(`不支持在 ${passEncoder.constructor.name} 中设置 setBlendConstant 值！`);
            }
        }
    }

    protected runViewport(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, viewport: Viewport)
    {
        if (viewport)
        {
            const isYup = viewport.isYup ?? true;
            const x = viewport.x ?? 0;
            let y = viewport.y ?? 0;
            const width = viewport.width ?? attachmentSize.width;
            const height = viewport.height ?? attachmentSize.height;
            const minDepth = viewport.minDepth ?? 0;
            const maxDepth = viewport.maxDepth ?? 0;

            if (isYup)
            {
                y = attachmentSize.height - y - height;
            }
            passEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
        }
        else
        {
            passEncoder.setViewport(0, 0, attachmentSize.width, attachmentSize.height, 0, 1);
        }
    }

    protected runScissorRect(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, scissorRect: ScissorRect)
    {
        if (scissorRect)
        {
            const isYup = scissorRect.isYup ?? true;
            const x = scissorRect.x ?? 0;
            let y = scissorRect.y ?? 0;
            const width = scissorRect.width ?? attachmentSize.width;
            const height = scissorRect.height ?? attachmentSize.height;

            if (isYup)
            {
                y = attachmentSize.height - y - height;
            }

            passEncoder.setScissorRect(x, y, width, height);
        }
        else
        {
            passEncoder.setScissorRect(0, 0, attachmentSize.width, attachmentSize.height);
        }
    }
}

let autoIndex = 0;
let autoVertexIndex = 0;

