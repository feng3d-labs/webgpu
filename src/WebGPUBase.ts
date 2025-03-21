import { anyEmitter } from "@feng3d/event";
import { BlendState, Buffer, ChainMap, CommandEncoder, computed, ComputedRef, CopyBufferToBuffer, CopyTextureToTexture, DepthStencilState, OcclusionQuery, reactive, ReadPixels, RenderObject, RenderPass, RenderPassObject, RenderPipeline, Submit, TextureLike, UnReadonly } from "@feng3d/render-api";

import { getGPUBindGroup } from "./caches/getGPUBindGroup";
import { getGPUBuffer } from "./caches/getGPUBuffer";
import { getGPUComputePipeline } from "./caches/getGPUComputePipeline";
import { getGPUPipelineLayout } from "./caches/getGPUPipelineLayout";
import { getGPURenderOcclusionQuery, GPURenderOcclusionQuery } from "./caches/getGPURenderOcclusionQuery";
import { getGPURenderPassDescriptor } from "./caches/getGPURenderPassDescriptor";
import { getGPURenderPassFormat } from "./caches/getGPURenderPassFormat";
import { getGPURenderPipeline } from "./caches/getGPURenderPipeline";
import { getGPURenderTimestampQuery } from "./caches/getGPURenderTimestampQuery";
import { getGPUTexture } from "./caches/getGPUTexture";
import { getGBuffer } from "./caches/getIGPUBuffer";
import { getNVertexBuffers } from "./caches/getNGPUVertexBuffers";
import { ComputeObject } from "./data/ComputeObject";
import { ComputePass } from "./data/ComputePass";
import "./data/polyfills/RenderObject";
import "./data/polyfills/RenderPass";
import { RenderBundle } from "./data/RenderBundle";
import { GPUQueue_submit, webgpuEvents } from "./eventnames";
import { RenderObjectCache } from "./internal/RenderObjectCache";
import { RenderPassFormat } from "./internal/RenderPassFormat";
import { copyDepthTexture } from "./utils/copyDepthTexture";
import { getGPUDevice } from "./utils/getGPUDevice";
import { readPixels } from "./utils/readPixels";
import { textureInvertYPremultiplyAlpha } from "./utils/textureInvertYPremultiplyAlpha";

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
    }
    protected _device: GPUDevice;

    constructor(device?: GPUDevice)
    {
        this.device = device;
    }

    submit(submit: Submit)
    {
        const device = this._device;

        // 提交前数值加一，用于处理提交前需要执行的操作。
        reactive(webgpuEvents).preSubmit = ~~reactive(webgpuEvents).preSubmit + 1;

        //
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

    async readBuffer(buffer: Buffer, offset?: GPUSize64, size?: GPUSize64)
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

        const gpuRenderBundle = this.getGPURenderBundle(device, renderBundleObject, renderPassFormat);

        passEncoder.executeBundles([gpuRenderBundle]);
    }

    private getGPURenderBundle(device: GPUDevice, renderBundleObject: RenderBundle, renderPassFormat: RenderPassFormat)
    {
        const gpuRenderBundleKey: GPURenderBundleKey = [device, renderBundleObject, renderPassFormat];
        let result = gpuRenderBundleMap.get(gpuRenderBundleKey);
        if (result) return result.value;

        result = computed(() =>
        {
            // 监听
            const r_renderBundleObject = reactive(renderBundleObject);
            r_renderBundleObject.renderObjects;
            r_renderBundleObject.descriptor?.depthReadOnly;
            r_renderBundleObject.descriptor?.stencilReadOnly;

            // 执行
            const descriptor: GPURenderBundleEncoderDescriptor = { ...renderBundleObject.descriptor, ...renderPassFormat };

            //
            const renderBundleEncoder = device.createRenderBundleEncoder(descriptor);

            //
            const renderObjectCaches = renderBundleObject.renderObjects.map((element) =>
            {
                return this.runRenderObject(renderBundleEncoder, renderPassFormat, element as RenderObject);
            });
            // RenderObjectCache.runs(renderObjectCaches, renderBundleEncoder);

            const gpuRenderBundle = renderBundleEncoder.finish();
            return gpuRenderBundle;
        });
        gpuRenderBundleMap.set(gpuRenderBundleKey, result);

        return result.value;
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
            const gpuBindGroup: GPUBindGroup = getGPUBindGroup(device, bindGroupLayout, bindingResources);
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
        const renderObjectCacheKey: RenderObjectCacheKey = [device, renderObject, renderPassFormat];
        let result = renderObjectCacheMap.get(renderObjectCacheKey);
        if (result)
        {
            result.value.run(passEncoder);

            return result.value;
        }

        const renderObjectCache = new RenderObjectCache();
        result = computed(() =>
        {
            this.runviewport(renderObject, renderPassFormat, renderObjectCache);
            this.runScissorRect(renderObject, renderPassFormat, renderObjectCache);
            this.runRenderPipeline(renderPassFormat, renderObject, renderObjectCache);
            this.runBindingResources(renderObject, renderObjectCache);
            this.runVertexAttributes(renderObject, renderObjectCache);
            this.runIndices(renderObject, renderObjectCache);
            this.runDraw(renderObject, renderObjectCache);

            return renderObjectCache;
        });
        renderObjectCacheMap.set(renderObjectCacheKey, result);

        result.value.run(passEncoder);

        return result.value;
    }

    protected runviewport(renderObject: RenderObject, renderPassFormat: RenderPassFormat, renderObjectCache: RenderObjectCache)
    {
        const r_renderObject = reactive(renderObject);
        const r_renderPassFormat = reactive(renderPassFormat);
        computed(() =>
        {
            const attachmentSize = r_renderPassFormat.attachmentSize;
            const viewport = r_renderObject.viewport;
            if (viewport)
            {
                const isYup = viewport.isYup ?? true;
                const x = viewport.x ?? 0;
                let y = viewport.y ?? 0;
                const width = viewport.width;
                const height = viewport.height;
                const minDepth = viewport.minDepth ?? 0;
                const maxDepth = viewport.maxDepth ?? 1;

                if (isYup)
                {
                    y = attachmentSize.height - y - height;
                }
                //
                renderObjectCache.push(["setViewport", x, y, width, height, minDepth, maxDepth])
            }
            else
            {
                //
                renderObjectCache.push(["setViewport", 0, 0, attachmentSize.width, attachmentSize.height, 0, 1]);
            }
        }).value;
    }

    protected runScissorRect(renderObject: RenderObject, renderPassFormat: RenderPassFormat, renderObjectCache: RenderObjectCache)
    {
        const r_renderObject = reactive(renderObject);
        const r_renderPassFormat = reactive(renderPassFormat);
        computed(() =>
        {
            const attachmentSize = r_renderPassFormat.attachmentSize;
            const scissorRect = r_renderObject.scissorRect;
            if (scissorRect)
            {
                const isYup = scissorRect.isYup ?? true;
                const x = scissorRect.x ?? 0;
                let y = scissorRect.y ?? 0;
                const width = scissorRect.width;
                const height = scissorRect.height;

                if (isYup)
                {
                    y = attachmentSize.height - y - height;
                }

                renderObjectCache.push(["setScissorRect", x, y, width, height]);
            }
            else
            {
                renderObjectCache.push(["setScissorRect", 0, 0, attachmentSize.width, attachmentSize.height]);
            }
        }).value;
    }

    protected runRenderPipeline(renderPassFormat: RenderPassFormat, renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        const device = this._device;
        const r_renderObject = reactive(renderObject);
        computed(() =>
        {
            // 监听
            r_renderObject.pipeline;
            r_renderObject.vertices;
            r_renderObject.indices;

            //
            const { pipeline, vertices, indices } = renderObject;
            //
            const indexFormat: GPUIndexFormat = indices ? (indices.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16") : undefined;
            const gpuRenderPipeline = getGPURenderPipeline(device, pipeline, renderPassFormat, vertices, indexFormat);

            //
            renderObjectCache.push(["setPipeline", gpuRenderPipeline]);

            //
            this.runStencilReference(pipeline, renderObjectCache);
            this.runBlendConstant(pipeline, renderObjectCache);
        }).value;
    }

    protected runStencilReference(pipeline: RenderPipeline, renderObjectCache: RenderObjectCache)
    {
        const r_pipeline = reactive(pipeline);
        computed(() =>
        {
            const stencilReference = getStencilReference(r_pipeline.depthStencil);
            if (stencilReference === undefined)
            {
                renderObjectCache.setStencilReference = undefined;
                return;
            }

            renderObjectCache.setStencilReference = [stencilReference];
        }).value;
    }

    protected runBlendConstant(pipeline: RenderPipeline, renderObjectCache: RenderObjectCache)
    {
        const r_pipeline = reactive(pipeline);
        computed(() =>
        {
            //
            const blendConstantColor = BlendState.getBlendConstantColor(r_pipeline.fragment?.targets?.[0]?.blend);
            if (blendConstantColor === undefined)
            {
                renderObjectCache.delete("setBlendConstant");
                return;
            }

            renderObjectCache.push(["setBlendConstant", blendConstantColor]);
        }).value;
    }

    protected runBindingResources(renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        const device = this._device;
        const r_renderObject = reactive(renderObject);
        computed(() =>
        {
            // 监听
            r_renderObject.bindingResources;

            // 执行
            renderObjectCache.setBindGroup = []
            const { bindingResources } = renderObject;
            const layout = getGPUPipelineLayout(device, { vertex: r_renderObject.pipeline.vertex.code, fragment: r_renderObject.pipeline.fragment?.code });
            layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
            {
                const gpuBindGroup: GPUBindGroup = getGPUBindGroup(device, bindGroupLayout, bindingResources);
                renderObjectCache.setBindGroup[group] = [group, gpuBindGroup];
            });
        }).value;
    }

    protected runVertexAttributes(renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        const device = this._device;
        const r_renderObject = reactive(renderObject);
        computed(() =>
        {
            // 监听
            r_renderObject.vertices;
            r_renderObject.pipeline.vertex;

            const { vertices, pipeline } = renderObject;
            //
            renderObjectCache.setVertexBuffer = [];
            const vertexBuffers = getNVertexBuffers(pipeline.vertex, vertices)
            vertexBuffers?.forEach((vertexBuffer, index) =>
            {
                const { data, offset, size } = reactive(vertexBuffer);

                const buffer = getGBuffer(data);
                (buffer as any).label = buffer.label || (`顶点属性 ${autoVertexIndex++}`);

                const gBuffer = getGPUBuffer(device, buffer);

                renderObjectCache.setVertexBuffer[index] = [index, gBuffer, offset, size];
            });
        }).value;
    }

    protected runIndices(renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        const r_renderObject = reactive(renderObject);

        computed(() =>
        {
            // 监听
            r_renderObject.indices;

            const { indices } = renderObject;
            if (!indices)
            {
                renderObjectCache.setIndexBuffer = undefined;
                return;
            }

            const device = this._device;

            const buffer = getGBuffer(indices);
            (buffer as UnReadonly<Buffer>).label = buffer.label || (`顶点索引 ${autoIndex++}`);

            const gBuffer = getGPUBuffer(device, buffer);

            //
            renderObjectCache.setIndexBuffer = [gBuffer, indices.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16", indices.byteOffset, indices.byteLength];

        }).value;
    }

    protected runDraw(renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        computed(() =>
        {
            const { draw } = reactive(renderObject);

            if (draw.__type__ === 'DrawVertex')
            {
                renderObjectCache.draw = [draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance];
            }
            else
            {
                renderObjectCache.drawIndexed = [draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance];
            }
        }).value;
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

type GPURenderBundleKey = [device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat];
const gpuRenderBundleMap = new ChainMap<GPURenderBundleKey, ComputedRef<GPURenderBundle>>();

type RenderObjectCacheKey = [device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat];
const renderObjectCacheMap = new ChainMap<RenderObjectCacheKey, ComputedRef<RenderObjectCache>>();