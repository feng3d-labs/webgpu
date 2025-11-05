import { computed, reactive } from '@feng3d/reactivity';
import { BlendState, Buffer, ChainMap, DepthStencilState, RenderObject } from '@feng3d/render-api';
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
    setViewport: [func: 'setViewport', x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number];
    setScissorRect: [func: 'setScissorRect', x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate];
    setPipeline: [func: 'setPipeline', pipeline: GPURenderPipeline];
    setBlendConstant: [func: 'setBlendConstant', color: GPUColor];
    setStencilReference: [func: 'setStencilReference', reference: GPUStencilValue];
    setBindGroup: [func: 'setBindGroup', index: number, bindGroup: GPUBindGroup][] = [];
    setVertexBuffer: [func: 'setVertexBuffer', slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][] = [];
    setIndexBuffer: [func: 'setIndexBuffer', buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
    draw: [func: 'draw', vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32];
    drawIndexed: [func: 'drawIndexed', indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32];
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
            const setViewport = computedSetViewport.value;
            if (state.setViewport !== setViewport && setViewport)
            {
                commands.push(setViewport);
                state.setViewport = setViewport;
            }

            const setScissorRect = computedSetScissorRect.value;
            if (state.setScissorRect !== setScissorRect && setScissorRect)
            {
                commands.push(setScissorRect);
                state.setScissorRect = setScissorRect;
            }

            const setBlendConstant = computedSetBlendConstant.value;
            if (state.setBlendConstant !== setBlendConstant && setBlendConstant)
            {
                commands.push(setBlendConstant);
                state.setBlendConstant = setBlendConstant;
            }

            const setStencilReference = computedSetStencilReference.value;
            if (state.setStencilReference !== setStencilReference && setStencilReference)
            {
                commands.push(setStencilReference);
            }
            const setPipeline = computedSetPipeline.value;
            if (state.setPipeline !== setPipeline)
            {
                commands.push(setPipeline);
                state.setPipeline = setPipeline;
            }

            const setBindGroup = computedSetBindGroup.value;
            for (let i = 0, len = setBindGroup.length; i < len; i++)
            {
                if (state.setBindGroup[i] !== setBindGroup[i] && setBindGroup[i])
                {
                    commands.push(setBindGroup[i]);
                    state.setBindGroup[i] = setBindGroup[i];
                }
            }

            const setVertexBuffer = computedSetVertexBuffer.value;
            for (let i = 0, len = setVertexBuffer.length; i < len; i++)
            {
                if (state.setVertexBuffer[i] !== setVertexBuffer[i])
                {
                    commands.push(setVertexBuffer[i]);
                    state.setVertexBuffer[i] = setVertexBuffer[i];
                }
            }

            const setIndexBuffer = computedSetIndexBuffer.value;
            if (state.setIndexBuffer !== setIndexBuffer && setIndexBuffer)
            {
                commands.push(setIndexBuffer);
                state.setIndexBuffer = setIndexBuffer;
            }

            const draw = renderObject.draw;

            //
            if (draw.__type__ === 'DrawVertex')
            {
                commands.push(['draw', draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance]);
            }
            else
            {
                commands.push(['drawIndexed', draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance]);
            }
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