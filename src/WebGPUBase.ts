import { anyEmitter } from "@feng3d/event";
import { BindingResources, BlendState, CanvasContext, ChainMap, CommandEncoder, ComputedRef, CopyBufferToBuffer, CopyTextureToTexture, DepthStencilState, GBuffer, OcclusionQuery, PrimitiveState, ReadPixels, RenderObject, RenderPass, RenderPassDescriptor, RenderPassObject, RenderPipeline, Sampler, Submit, Texture, TextureLike, TextureView, UnReadonly, VertexAttributes } from "@feng3d/render-api";

import { getGPUBindGroup } from "./caches/getGPUBindGroup";
import { getGPUBuffer } from "./caches/getGPUBuffer";
import { getGPUComputePipeline } from "./caches/getGPUComputePipeline";
import { getGPUPipelineLayout } from "./caches/getGPUPipelineLayout";
import { getGPURenderOcclusionQuery, GPURenderOcclusionQuery } from "./caches/getGPURenderOcclusionQuery";
import { getGPURenderPassDescriptor } from "./caches/getGPURenderPassDescriptor";
import { getGPURenderPassFormat } from "./caches/getGPURenderPassFormat";
import { getGPURenderTimestampQuery } from "./caches/getGPURenderTimestampQuery";
import { getGPUTexture } from "./caches/getGPUTexture";
import { getGBuffer } from "./caches/getIGPUBuffer";
import { getNGPURenderPipeline } from "./caches/getNGPURenderPipeline";
import { getRealGPUBindGroup } from "./const";
import { ComputeObject } from "./data/ComputeObject";
import { ComputePass } from "./data/ComputePass";
import { ComputePipeline } from "./data/ComputePipeline";
import "./data/polyfills/RenderObject";
import "./data/polyfills/RenderPass";
import { RenderBundle } from "./data/RenderBundle";
import { GPUQueue_submit } from "./eventnames";
import { NVertexBuffer } from "./internal/NGPUVertexBuffer";
import { RenderPassFormat } from "./internal/RenderPassFormat";
import { copyDepthTexture } from "./utils/copyDepthTexture";
import { getGPUDevice } from "./utils/getGPUDevice";
import { readPixels } from "./utils/readPixels";
import { textureInvertYPremultiplyAlpha } from "./utils/textureInvertYPremultiplyAlpha";

declare global
{
    interface GPUDevice
    {
        _bindGroupMap: ChainMap<[GPUBindGroupLayout, BindingResources], GPUBindGroup>;
        _bufferMap: WeakMap<GBuffer, ComputedRef<GPUBuffer>>;
        _contextMap: WeakMap<CanvasContext, ComputedRef<GPUCanvasContext>>;
        _computePipelineMap: WeakMap<ComputePipeline, GPUComputePipeline>;
        _samplerMap: WeakMap<Sampler, GPUSampler>;
        _textureViewMap: WeakMap<TextureView, GPUTextureView>;
        _textureMap: WeakMap<Texture, GPUTexture>;
        _renderPassDescriptorMap: WeakMap<RenderPassDescriptor, GPURenderPassDescriptor>;
        _shaderMap: Map<string, GPUShaderModule>;
        _pipelineLayoutMap: Map<string, GPUPipelineLayout>;
        _renderPassObjectsCommandMap: ChainMap<[string, RenderPassObject[]], {
            commands: Array<any>;
            setBindGroupCommands: Array<any>;
        }>;
        _renderObjectCommandMap: ChainMap<[string, RenderObject], Array<any>>;
        _renderPipelineMap: ChainMap<[RenderPipeline, string, PrimitiveState, VertexAttributes, GPUIndexFormat], {
            pipeline: ComputedRef<GPURenderPipeline>;
            vertexBuffers: NVertexBuffer[];
            _version: number;
        }>
    }
}

/**
 * WebGPU 基础类
 */
export class WebGPUBase
{
    /**
     * 初始化 WebGPU 获取 GPUDevice 。
     */
    async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        this.device = await getGPUDevice(options, descriptor);
        //
        this.device?.lost.then(async (info) =>
        {
            console.error(`WebGPU device was lost: ${info.message}`);

            // 'reason' will be 'destroyed' if we intentionally destroy the device.
            if (info.reason !== "destroyed")
            {
                // try again
                this.device = await getGPUDevice(options, descriptor);
            }
        });

        return this;
    }

    get device()
    {
        return this._device;
    }
    set device(v)
    {
        this._device = v;
        //
        if (this._device)
        {
            this._device._bindGroupMap ??= new ChainMap();
            this._device._renderPassObjectsCommandMap ??= new ChainMap();
            this._device._renderPipelineMap ??= new ChainMap();
            this._device._renderObjectCommandMap ??= new ChainMap();
            this._device._bufferMap ??= new WeakMap();
            this._device._contextMap ??= new WeakMap();
            this._device._computePipelineMap ??= new WeakMap();
            this._device._samplerMap ??= new WeakMap();
            this._device._textureMap ??= new WeakMap();
            this._device._textureViewMap ??= new WeakMap();
            this._device._renderPassDescriptorMap ??= new WeakMap();
            this._device._pipelineLayoutMap ??= new Map();
            this._device._shaderMap ??= new Map();
        }
    }
    protected _device: GPUDevice;

    constructor(device?: GPUDevice)
    {
        this.device = device;
    }

    submit(submit: Submit)
    {
        const device = this._device;

        const commandBuffers = submit.commandEncoders.map((v) =>
        {
            const commandBuffer = this.runCommandEncoder(v);

            return commandBuffer;
        });

        device.queue.submit(commandBuffers);

        // 派发提交WebGPU事件
        anyEmitter.emit(device.queue, GPUQueue_submit);
    }

    destoryTexture(texture: TextureLike)
    {
        getGPUTexture(this._device, texture, false)?.destroy();
    }

    textureInvertYPremultiplyAlpha(texture: TextureLike, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        const device = this._device;
        const gpuTexture = getGPUTexture(device, texture);

        textureInvertYPremultiplyAlpha(device, gpuTexture, options);
    }

    copyDepthTexture(sourceTexture: TextureLike, targetTexture: TextureLike)
    {
        const device = this._device;
        const gpuSourceTexture = getGPUTexture(device, sourceTexture);
        const gpuTargetTexture = getGPUTexture(device, targetTexture);

        copyDepthTexture(device, gpuSourceTexture, gpuTargetTexture);
    }

    async readPixels(gpuReadPixels: ReadPixels)
    {
        const device = this._device;
        const gpuTexture = getGPUTexture(device, gpuReadPixels.texture, false);

        const result = await readPixels(device, {
            ...gpuReadPixels,
            texture: gpuTexture,
        });

        gpuReadPixels.result = result;

        return result;
    }

    async readBuffer(buffer: GBuffer, offset?: GPUSize64, size?: GPUSize64)
    {
        const device = this._device;
        const gpuBuffer = getGPUBuffer(device, buffer);
        await gpuBuffer.mapAsync(GPUMapMode.READ);

        const result = gpuBuffer.getMappedRange(offset, size).slice(0);

        gpuBuffer.unmap();

        return result;
    }

    protected runCommandEncoder(commandEncoder: CommandEncoder)
    {
        const device = this._device;
        const gpuCommandEncoder = device.createCommandEncoder();

        commandEncoder.passEncoders.forEach((passEncoder) =>
        {
            if (!passEncoder.__type__)
            {
                this.runRenderPass(gpuCommandEncoder, passEncoder as RenderPass);
            }
            else if (passEncoder.__type__ === "RenderPass")
            {
                this.runRenderPass(gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type__ === "ComputePass")
            {
                this.runComputePass(gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type__ === "CopyTextureToTexture")
            {
                this.runCopyTextureToTexture(gpuCommandEncoder, passEncoder);
            }
            else if (passEncoder.__type__ === "CopyBufferToBuffer")
            {
                this.runCopyBufferToBuffer(gpuCommandEncoder, passEncoder);
            }
            else
            {
                console.error(`未处理 passEncoder ${passEncoder}`);
            }
        });

        return gpuCommandEncoder.finish();
    }

    protected runRenderPass(commandEncoder: GPUCommandEncoder, renderPass: RenderPass)
    {
        const device = this._device;
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

        this.runRenderPassObjects(passEncoder, renderPassFormat, renderObjects, occlusionQuery);

        passEncoder.end();

        // 处理不被遮挡查询。
        occlusionQuery.resolve(device, commandEncoder, renderPass);

        // 处理时间戳查询
        timestampQuery.resolve(device, commandEncoder, renderPass);
    }

    protected runRenderPassObjects(passEncoder: GPURenderPassEncoder, renderPassFormat: RenderPassFormat, renderPassObjects: readonly RenderPassObject[], occlusionQuery: GPURenderOcclusionQuery)
    {
        if (!renderPassObjects) return;
        //
        renderPassObjects.forEach((element) =>
        {
            if (!element.__type__)
            {
                this.runRenderObject(passEncoder, renderPassFormat, element as RenderObject);
            }
            else if (element.__type__ === "RenderObject")
            {
                this.runRenderObject(passEncoder, renderPassFormat, element);
            }
            else if (element.__type__ === "RenderBundle")
            {
                this.runRenderBundle(passEncoder, renderPassFormat, element);
            }
            else if (element.__type__ === "OcclusionQuery")
            {
                this.runRenderOcclusionQueryObject(passEncoder, renderPassFormat, element, occlusionQuery);
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
    protected runComputePass(commandEncoder: GPUCommandEncoder, computePass: ComputePass)
    {
        const device = this._device;

        const descriptor: GPUComputePassDescriptor = {};
        // 处理时间戳查询
        const timestampQuery = getGPURenderTimestampQuery(device, computePass?.timestampQuery);
        timestampQuery.init(device, descriptor);

        const passEncoder = commandEncoder.beginComputePass(descriptor);

        this.runComputeObjects(passEncoder, computePass.computeObjects);

        passEncoder.end();

        // 处理时间戳查询
        timestampQuery.resolve(device, commandEncoder, computePass);
    }

    protected runComputeObjects(passEncoder: GPUComputePassEncoder, computeObjects: ComputeObject[])
    {
        computeObjects.forEach((computeObject) =>
        {
            this.runComputeObject(passEncoder, computeObject);
        });
    }

    protected runCopyTextureToTexture(commandEncoder: GPUCommandEncoder, copyTextureToTexture: CopyTextureToTexture)
    {
        const device = this._device;

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

    protected runCopyBufferToBuffer(commandEncoder: GPUCommandEncoder, v: CopyBufferToBuffer)
    {
        const device = this._device;

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

    protected runRenderOcclusionQueryObject(passEncoder: GPURenderPassEncoder, renderPassFormat: RenderPassFormat, renderOcclusionQueryObject: OcclusionQuery, occlusionQuery: GPURenderOcclusionQuery)
    {
        passEncoder.beginOcclusionQuery(occlusionQuery.getQueryIndex(renderOcclusionQueryObject));

        renderOcclusionQueryObject.renderObjects.forEach((renderObject) =>
        {
            this.runRenderObject(passEncoder, renderPassFormat, renderObject);
        });

        passEncoder.endOcclusionQuery();
    }

    protected runRenderBundle(passEncoder: GPURenderPassEncoder, renderPassFormat: RenderPassFormat, renderBundleObject: RenderBundle)
    {
        const device = this._device;
        const renderBundleMap: ChainMap<[RenderBundle, string], GPURenderBundle> = device["_renderBundleMap"] = device["_renderBundleMap"] || new ChainMap();
        //
        let gpuRenderBundle: GPURenderBundle = renderBundleMap.get([renderBundleObject, renderPassFormat._key]);
        if (!gpuRenderBundle)
        {
            const descriptor: GPURenderBundleEncoderDescriptor = { ...renderBundleObject.descriptor, ...renderPassFormat };

            //
            const renderBundleEncoder = device.createRenderBundleEncoder(descriptor);

            this.runRenderBundleObjects(renderBundleEncoder, renderPassFormat, renderBundleObject.renderObjects);

            gpuRenderBundle = renderBundleEncoder.finish();
            renderBundleMap.set([renderBundleObject, renderPassFormat._key], gpuRenderBundle);
        }

        passEncoder.executeBundles([gpuRenderBundle]);
    }

    protected runRenderBundleObjects(passEncoder: GPURenderBundleEncoder, renderPassFormat: RenderPassFormat, renderObjects?: readonly RenderObject[])
    {
        //
        renderObjects.forEach((element) =>
        {
            this.runRenderObject(passEncoder, renderPassFormat, element as RenderObject);
        });
    }

    /**
     * 执行计算对象。
     *
     * @param device GPU设备。
     * @param passEncoder 计算通道编码器。
     * @param computeObject 计算对象。
     */
    protected runComputeObject(passEncoder: GPUComputePassEncoder, computeObject: ComputeObject)
    {
        const device = this._device;
        const { pipeline, uniforms: bindingResources, workgroups } = computeObject;

        const computePipeline = getGPUComputePipeline(device, pipeline);
        passEncoder.setPipeline(computePipeline);

        // 计算 bindGroups
        const layout = getGPUPipelineLayout(device, { compute: pipeline.compute.code });
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
    protected runRenderObject(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: RenderPassFormat, renderObject: RenderObject)
    {
        const device = this._device;
        const { viewport, scissorRect, pipeline, bindingResources: bindingResources, geometry } = renderObject;
        const attachmentSize = renderPassFormat.attachmentSize;

        if ("setViewport" in passEncoder)
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
        if ("setScissorRect" in passEncoder)
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

        const { primitive, vertices, indices, draw } = geometry;

        //
        const { pipeline: nPipeline, vertexBuffers } = getNGPURenderPipeline(device, pipeline, renderPassFormat, primitive, vertices, indices);

        //
        passEncoder.setPipeline(nPipeline.value);

        //
        const stencilReference = getStencilReference(pipeline.depthStencil);

        //
        const blendConstantColor = BlendState.getBlendConstantColor(pipeline.fragment?.targets?.[0]?.blend);

        // 设置模板测试替换值
        if (stencilReference !== undefined)
        {
            if ("setStencilReference" in passEncoder)
            {
                passEncoder.setStencilReference(stencilReference);
            }
            else
            {
                console.warn(`不支持在 ${passEncoder.constructor.name} 中设置 stencilReference 值！`);
            }
        }

        if (blendConstantColor !== undefined)
        {
            if ("setBlendConstant" in passEncoder)
            {
                passEncoder.setBlendConstant(blendConstantColor);
            }
            else
            {
                console.warn(`不支持在 ${passEncoder.constructor.name} 中设置 setBlendConstant 值！`);
            }
        }

        // 计算 bindGroups
        const layout = getGPUPipelineLayout(device, { vertex: pipeline.vertex.code, fragment: pipeline.fragment?.code });
        layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
        {
            const gpuBindGroup: GPUBindGroup = getGPUBindGroup(device, bindGroupLayout, bindingResources)[getRealGPUBindGroup]();
            passEncoder.setBindGroup(group, gpuBindGroup);
        });

        //
        vertexBuffers?.forEach((vertexBuffer, index) =>
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
}

let autoIndex = 0;
let autoVertexIndex = 0;

/**
 * 如果任意模板测试结果使用了 "replace" 运算，则需要再渲染前设置 `stencilReference` 值。
 *
 * @param depthStencil
 * @returns
 */
function getStencilReference(depthStencil?: DepthStencilState)
{
    if (!depthStencil) return undefined;

    const { stencilFront, stencilBack } = depthStencil;

    // 如果开启了模板测试，则需要设置模板索引值
    let stencilReference: number;
    if (stencilFront)
    {
        const { failOp, depthFailOp, passOp } = stencilFront;
        if (failOp === "replace" || depthFailOp === "replace" || passOp === "replace")
        {
            stencilReference = depthStencil?.stencilReference ?? 0;
        }
    }
    if (stencilBack)
    {
        const { failOp, depthFailOp, passOp } = stencilBack;
        if (failOp === "replace" || depthFailOp === "replace" || passOp === "replace")
        {
            stencilReference = depthStencil?.stencilReference ?? 0;
        }
    }

    return stencilReference;
}