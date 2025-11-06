import { computed, reactive } from '@feng3d/reactivity';
import { BlendState, Buffer, ChainMap, DepthStencilState, DrawIndexed, DrawVertex, RenderObject } from '@feng3d/render-api';
import { WGPUBindGroup } from '../caches/WGPUBindGroup';
import { WGPUBuffer } from '../caches/WGPUBuffer';
import { WGPUPipelineLayout } from '../caches/WGPUPipelineLayout';
import { WGPURenderPipeline } from '../caches/WGPURenderPipeline';
import { WGPUVertexBufferLayout } from '../caches/WGPUVertexBufferLayout';
import { ReactiveObject } from '../ReactiveObject';
import { RenderPassFormat } from './RenderPassFormat';

export type CommandType =
    | [func: 'setViewport', x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number]
    | [func: 'setScissorRect', x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate]
    | [func: 'setPipeline', pipeline: GPURenderPipeline]
    | [func: 'setBindGroup', index: number, bindGroup: GPUBindGroup]
    | [func: 'setVertexBuffer', slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64]
    | [func: 'setIndexBuffer', buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64]
    | [func: 'draw', vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32]
    | [func: 'drawIndexed', indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32]
    | [func: 'setBlendConstant', color: GPUColor]
    | [func: 'setStencilReference', reference: GPUStencilValue]
    | [func: 'executeBundles', bundles: GPURenderBundle[]]
    | [func: 'beginOcclusionQuery', queryIndex: GPUSize32]
    | [func: 'endOcclusionQuery']
    ;

export class WGPURenderObjectState
{
    commands: CommandType[] = [];
    _setViewport: [func: 'setViewport', x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number];
    _setScissorRect: [func: 'setScissorRect', x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate];
    _setPipeline: [func: 'setPipeline', pipeline: GPURenderPipeline];
    _setBlendConstant: [func: 'setBlendConstant', color: GPUColor];
    _setStencilReference: [func: 'setStencilReference', reference: GPUStencilValue];
    _setBindGroup: [func: 'setBindGroup', index: number, bindGroup: GPUBindGroup][] = [];
    _setVertexBuffer: [func: 'setVertexBuffer', slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][] = [];
    _setIndexBuffer: [func: 'setIndexBuffer', buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
    _drawIndexed: [func: 'drawIndexed', indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32];

    constructor(private passEncoder: GPURenderPassEncoder)
    {

    }

    setViewport(viewport: [func: 'setViewport', x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number])
    {
        if (this._setViewport !== viewport && viewport)
        {
            this.commands.push(viewport);
            this._setViewport = viewport;
        }
    }

    setScissorRect(scissorRect: [func: 'setScissorRect', x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate])
    {
        if (this._setScissorRect !== scissorRect && scissorRect)
        {
            this.commands.push(scissorRect);
            this._setScissorRect = scissorRect;
        }
    }

    setBlendConstant(blendConstant: [func: 'setBlendConstant', color: GPUColor])
    {
        if (this._setBlendConstant !== blendConstant && blendConstant)
        {
            this.commands.push(blendConstant);
            this._setBlendConstant = blendConstant;
        }
    }

    setStencilReference(stencilReference: [func: 'setStencilReference', reference: GPUStencilValue])
    {
        if (this._setStencilReference !== stencilReference && stencilReference)
        {
            this.commands.push(stencilReference);
            this._setStencilReference = stencilReference;
        }
    }

    setPipeline(pipeline: [func: 'setPipeline', pipeline: GPURenderPipeline])
    {
        if (this._setPipeline !== pipeline && pipeline)
        {
            this.commands.push(pipeline);
            this._setPipeline = pipeline;
        }
    }

    setBindGroup(bindGroups: [func: 'setBindGroup', index: number, bindGroup: GPUBindGroup][])
    {
        for (let i = 0, len = bindGroups.length; i < len; i++)
        {
            if (this._setBindGroup[i] !== bindGroups[i])
            {
                this.commands.push(bindGroups[i]);
                this._setBindGroup[i] = bindGroups[i];
            }
        }
    }

    setVertexBuffer(vertexBuffers: [func: 'setVertexBuffer', slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][])
    {
        for (let i = 0, len = vertexBuffers.length; i < len; i++)
        {
            if (this._setVertexBuffer[i] !== vertexBuffers[i])
            {
                this.commands.push(vertexBuffers[i]);
                this._setVertexBuffer[i] = vertexBuffers[i];
            }
        }
    }

    setIndexBuffer(indexBuffer: [func: 'setIndexBuffer', buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64])
    {
        if (this._setIndexBuffer !== indexBuffer && indexBuffer)
        {
            this.commands.push(indexBuffer);
            this._setIndexBuffer = indexBuffer;
        }
    }

    draw(draw: DrawVertex | DrawIndexed)
    {
        //
        if (draw.__type__ === 'DrawVertex')
        {
            this.commands.push(['draw', draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance]);
        }
        else
        {
            this.commands.push(['drawIndexed', draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance]);
        }
    }
}

export class WGPURenderObject extends ReactiveObject implements RenderPassObjectCommand
{
    constructor(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        super();

        this._onCreate(device, renderObject, renderPassFormat);
        //
        WGPURenderObject.map.set([device, renderObject, renderPassFormat], this);
        this.destroyCall(() => { WGPURenderObject.map.delete([device, renderObject, renderPassFormat]); });
    }

    private _onCreate(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        const r_renderObject = reactive(renderObject);
        const r_renderPassFormat = reactive(renderPassFormat);

        const computedSetViewport = computed(() =>
        {
            const attachmentSize = r_renderPassFormat.attachmentSize;
            const viewport = r_renderObject.viewport;

            let setViewport: [func: 'setViewport', x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number];

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
                setViewport = ['setViewport', x, y, width, height, minDepth, maxDepth];
            }
            else
            {
                //
                setViewport = ['setViewport', 0, 0, attachmentSize.width, attachmentSize.height, 0, 1];
            }

            return setViewport;
        });

        const computedSetScissorRect = computed(() =>
        {
            const attachmentSize = r_renderPassFormat.attachmentSize;

            let setScissorRect: [func: 'setScissorRect', x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate];
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

                setScissorRect = ['setScissorRect', x, y, width, height];
            }
            else
            {
                setScissorRect = ['setScissorRect', 0, 0, attachmentSize.width, attachmentSize.height];
            }

            return setScissorRect;
        });

        const computedSetPipeline = computed(() =>
        {
            r_renderObject.pipeline;
            r_renderObject.vertices;
            r_renderObject.indices;
            //
            const { pipeline, vertices, indices } = renderObject;
            //
            const indexFormat: GPUIndexFormat = indices ? (indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16') : undefined;

            //
            const wgpuRenderPipeline = WGPURenderPipeline.getInstance(device, pipeline, renderPassFormat, vertices, indexFormat);
            const gpuRenderPipeline = wgpuRenderPipeline.gpuRenderPipeline;

            //
            const setPipeline: [func: 'setPipeline', pipeline: GPURenderPipeline] = ['setPipeline', gpuRenderPipeline];

            return setPipeline;
        });

        const computedSetStencilReference = computed(() =>
        {
            let setStencilReference: [func: 'setStencilReference', reference: GPUStencilValue];
            //
            const stencilReference = getStencilReference(r_renderObject.pipeline.depthStencil);
            if (stencilReference === undefined)
            {
                setStencilReference = null;
            }
            else
            {
                setStencilReference = ['setStencilReference', stencilReference];
            }

            return setStencilReference;
        });

        const computedSetBlendConstant = computed(() =>
        {
            let setBlendConstant: [func: 'setBlendConstant', color: GPUColor];
            //
            const blendConstantColor = BlendState.getBlendConstantColor(r_renderObject.pipeline.fragment?.targets?.[0]?.blend);
            if (blendConstantColor === undefined)
            {
                setBlendConstant = null;
            }
            else
            {
                setBlendConstant = ['setBlendConstant', blendConstantColor];
            }

            return setBlendConstant;
        });

        const computedSetBindGroup = computed(() =>
        {
            // 监听
            r_renderObject.bindingResources;

            // 执行
            const { bindingResources } = renderObject;
            const layout = WGPUPipelineLayout.getPipelineLayout({ vertex: r_renderObject.pipeline.vertex.code, fragment: r_renderObject.pipeline.fragment?.code });

            const setBindGroup: [func: 'setBindGroup', index: number, bindGroup: GPUBindGroup][] = [];
            layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
            {
                const wgpuBindGroup = WGPUBindGroup.getInstance(device, bindGroupLayout, bindingResources);

                setBindGroup[group] = ['setBindGroup', group, wgpuBindGroup.gpuBindGroup];
            });

            return setBindGroup;
        });

        const computedSetVertexBuffer = computed(() =>
        {
            // 监听
            r_renderObject.vertices;
            r_renderObject.pipeline.vertex;

            //
            const wgpuVertexBufferLayout = WGPUVertexBufferLayout.getInstance(renderObject.pipeline.vertex, renderObject.vertices);
            const vertexDatas = wgpuVertexBufferLayout.vertexDatas;

            const setVertexBuffer: [func: 'setVertexBuffer', slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][] = [];
            vertexDatas?.forEach((data, index) =>
            {
                // 执行
                const offset = data.byteOffset;
                const size = data.byteLength;
                const buffer = Buffer.getBuffer(data.buffer);

                if (!buffer.label)
                {
                    reactive(buffer).label = (`顶点数据 ${autoVertexIndex++}`);
                }

                const wgpuBuffer = WGPUBuffer.getInstance(device, buffer);
                const gpuBuffer = wgpuBuffer.gpuBuffer;

                setVertexBuffer[index] = ['setVertexBuffer', index, gpuBuffer, offset, size];
            });

            return setVertexBuffer;
        });

        const computedSetIndexBuffer = computed(() =>
        {
            let setIndexBuffer: [func: 'setIndexBuffer', buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
            // 监听
            r_renderObject.indices;

            //
            const { indices } = renderObject;

            // 监听
            r_renderObject.indices;

            if (!indices)
            {
                setIndexBuffer = null;
            }
            else
            {
                const buffer = Buffer.getBuffer(indices.buffer);

                if (!buffer.label)
                {
                    reactive(buffer).label = (`顶点索引 ${autoIndex++}`);
                }

                const gBuffer = WGPUBuffer.getInstance(device, buffer);

                //
                setIndexBuffer = ['setIndexBuffer', gBuffer.gpuBuffer, indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16', indices.byteOffset, indices.byteLength];
            }

            return setIndexBuffer;
        });

        this.run = (device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState) =>
        {
            state.setViewport(computedSetViewport.value);

            state.setScissorRect(computedSetScissorRect.value);

            state.setBlendConstant(computedSetBlendConstant.value);

            state.setStencilReference(computedSetStencilReference.value);

            state.setPipeline(computedSetPipeline.value);

            state.setBindGroup(computedSetBindGroup.value);

            state.setVertexBuffer(computedSetVertexBuffer.value);

            state.setIndexBuffer(computedSetIndexBuffer.value);

            state.draw(renderObject.draw);
        };
    }

    run: (device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState) => void;

    static getInstance(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        return this.map.get([device, renderObject, renderPassFormat]) || new WGPURenderObject(device, renderObject, renderPassFormat);
    }
    static readonly map = new ChainMap<[GPUDevice, RenderObject, RenderPassFormat], WGPURenderObject>();
}

export interface RenderPassObjectCommand
{
    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState): void;
}

export interface PassEncoderCommand
{
    run(commandEncoder: GPUCommandEncoder): void;
}

export function runCommands(renderBundleEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, commands: CommandType[])
{
    for (let i = 0, n = commands.length; i < n; i++)
    {
        const command = commands[i];

        if (command[0] === 'setBindGroup')
        {
            renderBundleEncoder.setBindGroup(command[1], command[2]);
        }
        else
        {
            renderBundleEncoder[command[0]](command[1], command[2], command[3], command[4], command[5], command[6]);
        }
    }
}

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

let autoVertexIndex = 0;
let autoIndex = 0;