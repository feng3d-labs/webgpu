import { computed, Computed, effect, effectScope, EffectScope, reactive, UnReadonly } from '@feng3d/reactivity';
import { BlendState, Buffer, ChainMap, DepthStencilState, ReadPixels, RenderObject, RenderPipeline, Submit, TextureLike } from '@feng3d/render-api';

import { GPUBindGroupManager } from './caches/GPUBindGroupManager';
import { GPUBufferManager } from './caches/GPUBufferManager';
import { GPUPipelineLayoutManager } from './caches/GPUPipelineLayoutManager';
import { GPURenderPipelineManager } from './caches/GPURenderPipelineManager';
import { WGPUTexture } from './caches/GPUTextureManager';
import { GPUVertexBufferManager } from './caches/GPUVertexBufferManager';
import './data/polyfills/RenderObject';
import './data/polyfills/RenderPass';
import { RenderBundle } from './data/RenderBundle';
import { RenderBundleCommand } from './internal/RenderBundleCommand';
import { CommandType, RenderObjectCache } from './internal/RenderObjectCache';
import { RenderPassFormat } from './internal/RenderPassFormat';
import { SubmitCommand } from './internal/SubmitCommand';
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

    readonly effectScope: EffectScope;

    constructor(device?: GPUDevice)
    {
        this.device = device;

        this.effectScope = effectScope();
    }

    destroy()
    {
        const r_this = reactive(this);

        r_this.device = null;

        this.effectScope.stop();
    }

    submit(submit: Submit)
    {
        const device = this.device;

        const submitCommand = SubmitCommand.getInstance(this, submit);

        submitCommand.run(device);
    }

    destoryTexture(texture: TextureLike)
    {
        WGPUTexture.destroy(this.device, texture);
    }

    textureInvertYPremultiplyAlpha(texture: TextureLike, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        const device = this.device;
        const gpuTexture = WGPUTexture.getInstance(this.device, texture);

        textureInvertYPremultiplyAlpha(device, gpuTexture.gpuTexture, options);
    }

    copyDepthTexture(sourceTexture: TextureLike, targetTexture: TextureLike)
    {
        const device = this.device;
        const gpuSourceTexture = WGPUTexture.getInstance(this.device, sourceTexture);
        const gpuTargetTexture = WGPUTexture.getInstance(this.device, targetTexture);

        copyDepthTexture(device, gpuSourceTexture.gpuTexture, gpuTargetTexture.gpuTexture);
    }

    async readPixels(gpuReadPixels: ReadPixels)
    {
        const device = this.device;
        const gpuTexture = WGPUTexture.getInstance(this.device, gpuReadPixels.texture, false);

        const result = await readPixels(device, {
            ...gpuReadPixels,
            texture: gpuTexture.gpuTexture,
        });

        gpuReadPixels.result = result;

        return result;
    }

    async readBuffer(buffer: Buffer, offset?: GPUSize64, size?: GPUSize64)
    {
        const device = this.device;
        const gpuBuffer = GPUBufferManager.getGPUBuffer(device, buffer);

        await gpuBuffer.mapAsync(GPUMapMode.READ);

        const result = gpuBuffer.getMappedRange(offset, size).slice(0);

        gpuBuffer.unmap();

        return result;
    }

    runRenderBundle(renderPassFormat: RenderPassFormat, renderBundleObject: RenderBundle)
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

    runRenderObjects(renderPassFormat: RenderPassFormat, renderObjects: readonly RenderObject[])
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
     * 执行渲染对象。
     *
     * @param device GPU设备。
     * @param passEncoder 渲染通道编码器。
     * @param renderObject 渲染对象。
     * @param renderPass 渲染通道。
     */
    runRenderObject(renderPassFormat: RenderPassFormat, renderObject: RenderObject)
    {
        const device = this.device;
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
                renderObjectCache.setViewport = ['setViewport', x, y, width, height, minDepth, maxDepth];
            }
            else
            {
                //
                renderObjectCache.setViewport = ['setViewport', 0, 0, attachmentSize.width, attachmentSize.height, 0, 1];
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

                renderObjectCache.setScissorRect = ['setScissorRect', x, y, width, height];
            }
            else
            {
                renderObjectCache.setScissorRect = ['setScissorRect', 0, 0, attachmentSize.width, attachmentSize.height];
            }
        }).value;
    }

    protected runRenderPipeline(renderPassFormat: RenderPassFormat, renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        const device = this.device;
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
            renderObjectCache.setPipeline = ['setPipeline', gpuRenderPipeline];

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
                renderObjectCache.setStencilReference = null;

                return;
            }

            renderObjectCache.setStencilReference = ['setStencilReference', stencilReference];
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
                renderObjectCache.setBlendConstant = null;

                return;
            }

            renderObjectCache.setBlendConstant = ['setBlendConstant', blendConstantColor];
        }).value;
    }

    protected runBindingResources(renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        const device = this.device;
        const r_renderObject = reactive(renderObject);

        computed(() =>
        {
            // 监听
            r_renderObject.bindingResources;

            // 执行
            const { bindingResources } = renderObject;
            const layout = GPUPipelineLayoutManager.getPipelineLayout({ vertex: r_renderObject.pipeline.vertex.code, fragment: r_renderObject.pipeline.fragment?.code });

            renderObjectCache.setBindGroup.length = layout.bindGroupLayouts.length;
            layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
            {
                const gpuBindGroup: GPUBindGroup = GPUBindGroupManager.getGPUBindGroup(device, bindGroupLayout, bindingResources);

                renderObjectCache.setBindGroup[group] = ['setBindGroup', group, gpuBindGroup];
            });
        }).value;
    }

    protected runVertexAttributes(renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        const device = this.device;
        const r_renderObject = reactive(renderObject);

        computed(() =>
        {
            // 监听
            r_renderObject.vertices;
            r_renderObject.pipeline.vertex;

            const { vertices, pipeline } = renderObject;

            //
            const vertexBuffers = GPUVertexBufferManager.getNVertexBuffers(pipeline.vertex, vertices);

            renderObjectCache.setVertexBuffer.length = vertexBuffers?.length ?? 0;
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

                renderObjectCache.setVertexBuffer[index] = ['setVertexBuffer', index, gBuffer, offset, size];
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
                renderObjectCache.setIndexBuffer = null;

                return;
            }

            const device = this.device;

            const buffer = GPUBufferManager.getBuffer(indices);

            (buffer as UnReadonly<Buffer>).label = buffer.label || (`顶点索引 ${autoIndex++}`);

            const gBuffer = GPUBufferManager.getGPUBuffer(device, buffer);

            //
            renderObjectCache.setIndexBuffer = ['setIndexBuffer', gBuffer, indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16', indices.byteOffset, indices.byteLength];
        }).value;
    }

    protected runDraw(renderObject: RenderObject, renderObjectCache: RenderObjectCache)
    {
        computed(() =>
        {
            const { draw } = reactive(renderObject);

            renderObjectCache.draw = null;
            renderObjectCache.drawIndexed = null;
            if (draw.__type__ === 'DrawVertex')
            {
                renderObjectCache.draw = ['draw', draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance];
            }
            else
            {
                renderObjectCache.drawIndexed = ['drawIndexed', draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance];
            }
        }).value;
    }

    private _renderObjectCachesMap = new ChainMap<RenderObjectCachesKey, Computed<RenderObjectCache[]>>();
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