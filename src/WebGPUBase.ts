import { computed, Computed, effect, reactive } from '@feng3d/reactivity';
import { BlendState, Buffer, ChainMap, CommandEncoder, CopyBufferToBuffer, CopyTextureToTexture, DepthStencilState, OcclusionQuery, ReadPixels, RenderObject, RenderPass, RenderPassObject, RenderPipeline, Submit, TextureLike, UnReadonly } from '@feng3d/render-api';

import { GPUBindGroupManager } from './caches/GPUBindGroupManager';
import { GPUBufferManager } from './caches/GPUBufferManager';
import { GPUComputePassDescriptorManager } from './caches/GPUComputePassDescriptorManager';
import { GPUComputePipelineManager } from './caches/GPUComputePipelineManager';
import { GPUPipelineLayoutManager } from './caches/GPUPipelineLayoutManager';
import { GPURenderPassDescriptorManager } from './caches/GPURenderPassDescriptorManager';
import { GPURenderPassFormatManager } from './caches/GPURenderPassFormatManager';
import { GPURenderPipelineManager } from './caches/GPURenderPipelineManager';
import { GPUTextureManager } from './caches/GPUTextureManager';
import { GPUVertexBufferManager } from './caches/GPUVertexBufferManager';
import { ComputeObject } from './data/ComputeObject';
import { ComputePass } from './data/ComputePass';
import './data/polyfills/RenderObject';
import './data/polyfills/RenderPass';
import { RenderBundle } from './data/RenderBundle';
import { CommandEncoderCommand, CommandType, ComputeObjectCommand, ComputePassCommand, CopyBufferToBufferCommand, CopyTextureToTextureCommand, OcclusionQueryCache, RenderBundleCommand, RenderObjectCache, RenderPassCommand, RenderPassObjectCommand, SubmitCommand } from './internal/RenderObjectCache';
import { RenderPassFormat } from './internal/RenderPassFormat';
import { copyDepthTexture } from './utils/copyDepthTexture';
import { getGPUDevice } from './utils/getGPUDevice';
import { readPixels } from './utils/readPixels';
import { textureInvertYPremultiplyAlpha } from './utils/textureInvertYPremultiplyAlpha';

declare global
{
    interface GPUCommandEncoder
    {
        /**
         * 创建时由引擎设置。
         */
        device: GPUDevice;
    }

    interface GPURenderPassEncoder
    {
        /**
         * 创建时由引擎设置。
         */
        device: GPUDevice;
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
            if (info.reason !== 'destroyed')
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

        const submitCommand = new SubmitCommand();

        //
        submitCommand.commandBuffers = submit.commandEncoders.map((v) =>
        {
            const commandBuffer = this.runCommandEncoder(v);

            return commandBuffer;
        });

        submitCommand.run(device);
    }

    destoryTexture(texture: TextureLike)
    {
        GPUTextureManager.getGPUTexture(this._device, texture, false)?.destroy();
    }

    textureInvertYPremultiplyAlpha(texture: TextureLike, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        const device = this._device;
        const gpuTexture = GPUTextureManager.getGPUTexture(device, texture);

        textureInvertYPremultiplyAlpha(device, gpuTexture, options);
    }

    copyDepthTexture(sourceTexture: TextureLike, targetTexture: TextureLike)
    {
        const device = this._device;
        const gpuSourceTexture = GPUTextureManager.getGPUTexture(device, sourceTexture);
        const gpuTargetTexture = GPUTextureManager.getGPUTexture(device, targetTexture);

        copyDepthTexture(device, gpuSourceTexture, gpuTargetTexture);
    }

    async readPixels(gpuReadPixels: ReadPixels)
    {
        const device = this._device;
        const gpuTexture = GPUTextureManager.getGPUTexture(device, gpuReadPixels.texture, false);

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
        const gpuBuffer = GPUBufferManager.getGPUBuffer(device, buffer);

        await gpuBuffer.mapAsync(GPUMapMode.READ);

        const result = gpuBuffer.getMappedRange(offset, size).slice(0);

        gpuBuffer.unmap();

        return result;
    }

    protected runCommandEncoder(commandEncoder: CommandEncoder)
    {
        const commandEncoderCommand = new CommandEncoderCommand();

        commandEncoderCommand.passEncoders = commandEncoder.passEncoders.map((passEncoder) =>
        {
            if (!passEncoder.__type__)
            {
                return this.runRenderPass(passEncoder as RenderPass);
            }
            else if (passEncoder.__type__ === 'RenderPass')
            {
                return this.runRenderPass(passEncoder);
            }
            else if (passEncoder.__type__ === 'ComputePass')
            {
                return this.runComputePass(passEncoder);
            }
            else if (passEncoder.__type__ === 'CopyTextureToTexture')
            {
                return this.runCopyTextureToTexture(passEncoder);
            }
            else if (passEncoder.__type__ === 'CopyBufferToBuffer')
            {
                return this.runCopyBufferToBuffer(passEncoder);
            }

            console.error(`未处理 passEncoder ${passEncoder}`);

            return null;
        });

        return commandEncoderCommand;
    }

    protected runRenderPass(renderPass: RenderPass)
    {
        const device = this._device;
        let renderPassCommand = this._renderPassCommandMap.get(renderPass);

        if (renderPassCommand) return renderPassCommand;

        renderPassCommand = new RenderPassCommand();

        effect(() =>
        {
            const r_renderPass = reactive(renderPass);

            r_renderPass.renderPassObjects;
            r_renderPass.descriptor;

            const { descriptor, renderPassObjects } = renderPass;

            renderPassCommand.renderPassDescriptor = GPURenderPassDescriptorManager.getGPURenderPassDescriptor(device, renderPass);

            const renderPassFormat = GPURenderPassFormatManager.getGPURenderPassFormat(descriptor);

            const renderPassObjectCommands = this.runRenderPassObjects(renderPassFormat, renderPassObjects);
            const commands: CommandType[] = [];
            const state = new RenderObjectCache();

            renderPassObjectCommands?.forEach((command) =>
            {
                command.run(device, commands, state);
            });
            renderPassCommand.commands = commands;
        });

        this._renderPassCommandMap.set(renderPass, renderPassCommand);

        return renderPassCommand;
    }

    private runRenderPassObjects(renderPassFormat: RenderPassFormat, renderPassObjects: readonly RenderPassObject[])
    {
        const renderPassObjectCommandsKey: RenderPassObjectCommandsKey = [renderPassObjects, renderPassFormat];
        let result = this._renderPassObjectCommandsMap.get(renderPassObjectCommandsKey);

        if (result) return result.value;

        result = computed(() =>
        {
            let queryIndex = 0;
            const renderPassObjectCommands: RenderPassObjectCommand[] = renderPassObjects?.map((element) =>
            {
                if (!element.__type__)
                {
                    return this.runRenderObject(renderPassFormat, element as RenderObject);
                }
                if (element.__type__ === 'RenderObject')
                {
                    return this.runRenderObject(renderPassFormat, element);
                }
                if (element.__type__ === 'RenderBundle')
                {
                    return this.runRenderBundle(renderPassFormat, element);
                }
                if (element.__type__ === 'OcclusionQuery')
                {
                    const occlusionQueryCache = this.runRenderOcclusionQueryObject(renderPassFormat, element);

                    occlusionQueryCache.queryIndex = queryIndex++;

                    return occlusionQueryCache;
                }

                throw `未处理 ${(element as RenderPassObject).__type__} 类型的渲染通道对象！`;
            });

            return renderPassObjectCommands;
        });

        this._renderPassObjectCommandsMap.set(renderPassObjectCommandsKey, result);

        return result.value;
    }

    /**
     * 执行计算通道。
     *
     * @param device GPU设备。
     * @param commandEncoder 命令编码器。
     * @param computePass 计算通道。
     */
    protected runComputePass(computePass: ComputePass)
    {
        const computePassCommand = new ComputePassCommand();

        computePassCommand.descriptor = GPUComputePassDescriptorManager.getGPUComputePassDescriptor(this._device, computePass);
        computePassCommand.computeObjectCommands = this.runComputeObjects(computePass.computeObjects);

        return computePassCommand;
    }

    protected runComputeObjects(computeObjects: ComputeObject[])
    {
        return computeObjects.map((computeObject) => this.runComputeObject(computeObject));
    }

    protected runCopyTextureToTexture(copyTextureToTexture: CopyTextureToTexture)
    {
        const device = this._device;

        const copyTextureToTextureCommand = new CopyTextureToTextureCommand();

        const sourceTexture = GPUTextureManager.getGPUTexture(device, copyTextureToTexture.source.texture);
        const destinationTexture = GPUTextureManager.getGPUTexture(device, copyTextureToTexture.destination.texture);

        copyTextureToTextureCommand.source = {
            ...copyTextureToTexture.source,
            texture: sourceTexture,
        };

        copyTextureToTextureCommand.destination = {
            ...copyTextureToTexture.destination,
            texture: destinationTexture,
        };

        copyTextureToTextureCommand.copySize = copyTextureToTexture.copySize;

        return copyTextureToTextureCommand;
    }

    protected runCopyBufferToBuffer(copyBufferToBuffer: CopyBufferToBuffer)
    {
        const device = this._device;

        const copyBufferToBufferCommand = new CopyBufferToBufferCommand();

        copyBufferToBufferCommand.source = GPUBufferManager.getGPUBuffer(device, copyBufferToBuffer.source);
        copyBufferToBufferCommand.sourceOffset = copyBufferToBuffer.sourceOffset ?? 0;
        copyBufferToBufferCommand.destination = GPUBufferManager.getGPUBuffer(device, copyBufferToBuffer.destination);
        copyBufferToBufferCommand.destinationOffset = copyBufferToBuffer.destinationOffset ?? 0;
        copyBufferToBufferCommand.size = copyBufferToBuffer.size ?? copyBufferToBuffer.source.size;

        return copyBufferToBufferCommand;
    }

    protected runRenderOcclusionQueryObject(renderPassFormat: RenderPassFormat, renderOcclusionQueryObject: OcclusionQuery)
    {
        const occlusionQueryCache = new OcclusionQueryCache();

        occlusionQueryCache.renderObjectCaches = this.runRenderObjects(renderPassFormat, renderOcclusionQueryObject.renderObjects);

        return occlusionQueryCache;
    }

    private runRenderBundle(renderPassFormat: RenderPassFormat, renderBundleObject: RenderBundle)
    {
        const gpuRenderBundleKey: GPURenderBundleKey = [renderBundleObject, renderPassFormat];
        let result = gpuRenderBundleMap.get(gpuRenderBundleKey);

        if (result) return result.value;

        const renderBundleCommand = new RenderBundleCommand();

        result = computed(() =>
        {
            // 监听
            const r_renderBundleObject = reactive(renderBundleObject);

            r_renderBundleObject.renderObjects;
            r_renderBundleObject.descriptor?.depthReadOnly;
            r_renderBundleObject.descriptor?.stencilReadOnly;

            // 执行
            const descriptor: GPURenderBundleEncoderDescriptor = { ...renderBundleObject.descriptor, ...renderPassFormat };

            renderBundleCommand.descriptor = descriptor;

            const renderObjectCaches = this.runRenderObjects(renderPassFormat, renderBundleObject.renderObjects);

            //
            const commands: CommandType[] = [];
            const state = new RenderObjectCache();

            renderObjectCaches.forEach((renderObjectCache) =>
            {
                renderObjectCache.run(undefined, commands, state);
            });

            renderBundleCommand.bundleCommands = commands.filter((command) => (
                command[0] !== 'setViewport'
                && command[0] !== 'setScissorRect'
                && command[0] !== 'setBlendConstant'
                && command[0] !== 'setStencilReference'
            ));

            return renderBundleCommand;
        });
        gpuRenderBundleMap.set(gpuRenderBundleKey, result);

        return result.value;
    }

    private runRenderObjects(renderPassFormat: RenderPassFormat, renderObjects: readonly RenderObject[])
    {
        const renderObjectCachesKey: RenderObjectCachesKey = [renderObjects, renderPassFormat];
        let result = this._renderObjectCachesMap.get(renderObjectCachesKey);

        if (result) return result.value;

        result = computed(() =>
        {
            //
            const renderObjectCaches = renderObjects.map((element) =>
                this.runRenderObject(renderPassFormat, element as RenderObject));

            return renderObjectCaches;
        });
        this._renderObjectCachesMap.set(renderObjectCachesKey, result);

        return result.value;
    }

    /**
     * 执行计算对象。
     *
     * @param device GPU设备。
     * @param passEncoder 计算通道编码器。
     * @param computeObject 计算对象。
     */
    protected runComputeObject(computeObject: ComputeObject)
    {
        const device = this._device;
        const { pipeline, bindingResources, workgroups } = computeObject;

        const computePipeline = GPUComputePipelineManager.getGPUComputePipeline(device, pipeline);

        const computeObjectCommand = new ComputeObjectCommand();

        computeObjectCommand.computePipeline = computePipeline;

        // 计算 bindGroups
        computeObjectCommand.setBindGroup = [];
        const layout = GPUPipelineLayoutManager.getPipelineLayout({ compute: pipeline.compute.code });

        layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
        {
            const gpuBindGroup: GPUBindGroup = GPUBindGroupManager.getGPUBindGroup(device, bindGroupLayout, bindingResources);

            computeObjectCommand.setBindGroup.push([group, gpuBindGroup]);
        });

        computeObjectCommand.dispatchWorkgroups = [workgroups.workgroupCountX, workgroups.workgroupCountY, workgroups.workgroupCountZ];

        return computeObjectCommand;
    }

    /**
     * 执行渲染对象。
     *
     * @param device GPU设备。
     * @param passEncoder 渲染通道编码器。
     * @param renderObject 渲染对象。
     * @param renderPass 渲染通道。
     */
    protected runRenderObject(renderPassFormat: RenderPassFormat, renderObject: RenderObject)
    {
        const device = this._device;
        const renderObjectCacheKey: RenderObjectCacheKey = [device, renderObject, renderPassFormat];
        let result = renderObjectCacheMap.get(renderObjectCacheKey);

        if (result)
        {
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
                renderObjectCache.push(['setViewport', x, y, width, height, minDepth, maxDepth]);
            }
            else
            {
                //
                renderObjectCache.push(['setViewport', 0, 0, attachmentSize.width, attachmentSize.height, 0, 1]);
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

                renderObjectCache.push(['setScissorRect', x, y, width, height]);
            }
            else
            {
                renderObjectCache.push(['setScissorRect', 0, 0, attachmentSize.width, attachmentSize.height]);
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
            const indexFormat: GPUIndexFormat = indices ? (indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16') : undefined;
            const gpuRenderPipeline = GPURenderPipelineManager.getGPURenderPipeline(device, pipeline, renderPassFormat, vertices, indexFormat);

            //
            renderObjectCache.push(['setPipeline', gpuRenderPipeline]);

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
                renderObjectCache.delete('setStencilReference');

                return;
            }

            renderObjectCache.push(['setStencilReference', stencilReference]);
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
                renderObjectCache.delete('setBlendConstant');

                return;
            }

            renderObjectCache.push(['setBlendConstant', blendConstantColor]);
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
            renderObjectCache.delete('setBindGroup');
            const { bindingResources } = renderObject;
            const layout = GPUPipelineLayoutManager.getPipelineLayout({ vertex: r_renderObject.pipeline.vertex.code, fragment: r_renderObject.pipeline.fragment?.code });

            layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
            {
                const gpuBindGroup: GPUBindGroup = GPUBindGroupManager.getGPUBindGroup(device, bindGroupLayout, bindingResources);

                renderObjectCache.push(['setBindGroup', group, gpuBindGroup]);
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
            renderObjectCache.delete('setVertexBuffer');
            const vertexBuffers = GPUVertexBufferManager.getNVertexBuffers(pipeline.vertex, vertices);

            vertexBuffers?.forEach((vertexBuffer, index) =>
            {
                // 监听
                const r_vertexBuffer = reactive(vertexBuffer);

                r_vertexBuffer.data;
                r_vertexBuffer.offset;
                r_vertexBuffer.size;

                // 执行
                const { data, offset, size } = vertexBuffer;
                const buffer = GPUBufferManager.getBuffer(data);

                (buffer as any).label = buffer.label || (`顶点属性 ${autoVertexIndex++}`);

                const gBuffer = GPUBufferManager.getGPUBuffer(device, buffer);

                renderObjectCache.push(['setVertexBuffer', index, gBuffer, offset, size]);
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
                renderObjectCache.delete('setIndexBuffer');

                return;
            }

            const device = this._device;

            const buffer = GPUBufferManager.getBuffer(indices);

            (buffer as UnReadonly<Buffer>).label = buffer.label || (`顶点索引 ${autoIndex++}`);

            const gBuffer = GPUBufferManager.getGPUBuffer(device, buffer);

            //
            renderObjectCache.push(['setIndexBuffer', gBuffer, indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16', indices.byteOffset, indices.byteLength]);
        }).value;
    }

    protected runDraw(renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        computed(() =>
        {
            const { draw } = reactive(renderObject);

            renderObjectCache.delete('draw');
            renderObjectCache.delete('drawIndexed');
            if (draw.__type__ === 'DrawVertex')
            {
                renderObjectCache.push(['draw', draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance]);
            }
            else
            {
                renderObjectCache.push(['drawIndexed', draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance]);
            }
        }).value;
    }

    private _renderPassCommandMap = new WeakMap<RenderPass, RenderPassCommand>();

    private _renderObjectCachesMap = new ChainMap<RenderObjectCachesKey, Computed<RenderObjectCache[]>>();
    private _renderPassObjectCommandsMap = new ChainMap<RenderPassObjectCommandsKey, Computed<RenderPassObjectCommand[]>>();
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

        if (failOp === 'replace' || depthFailOp === 'replace' || passOp === 'replace')
        {
            stencilReference = depthStencil?.stencilReference ?? 0;
        }
    }
    if (stencilBack)
    {
        const { failOp, depthFailOp, passOp } = stencilBack;

        if (failOp === 'replace' || depthFailOp === 'replace' || passOp === 'replace')
        {
            stencilReference = depthStencil?.stencilReference ?? 0;
        }
    }

    return stencilReference;
}

type GPURenderBundleKey = [renderBundle: RenderBundle, renderPassFormat: RenderPassFormat];
const gpuRenderBundleMap = new ChainMap<GPURenderBundleKey, Computed<RenderBundleCommand>>();

type RenderObjectCacheKey = [device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat];
const renderObjectCacheMap = new ChainMap<RenderObjectCacheKey, Computed<RenderObjectCache>>();

type RenderObjectCachesKey = [renderObjects: readonly RenderObject[], renderPassFormat: RenderPassFormat];
type RenderPassObjectCommandsKey = [renderPassObjects: readonly RenderPassObject[], renderPassFormat: RenderPassFormat];