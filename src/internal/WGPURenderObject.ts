import { reactive } from '@feng3d/reactivity';
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

    constructor(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        super();

        this._onCreate(device, renderObject, renderPassFormat);
    }

    private _onCreate(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        const r_renderObject = reactive(renderObject);
        const r_renderPassFormat = reactive(renderPassFormat);

        this.effect(() =>
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
                this.setViewport = ['setViewport', x, y, width, height, minDepth, maxDepth];
            }
            else
            {
                //
                this.setViewport = ['setViewport', 0, 0, attachmentSize.width, attachmentSize.height, 0, 1];
            }

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

                this.setScissorRect = ['setScissorRect', x, y, width, height];
            }
            else
            {
                this.setScissorRect = ['setScissorRect', 0, 0, attachmentSize.width, attachmentSize.height];
            }

            // 监听
            r_renderObject.pipeline;
            r_renderObject.vertices;
            r_renderObject.indices;

            //
            const { pipeline, vertices, indices } = renderObject;
            //
            const indexFormat: GPUIndexFormat = indices ? (indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16') : undefined;

            //
            const wgpuRenderPipeline = WGPURenderPipeline.getInstance(device, pipeline, renderPassFormat, vertices, indexFormat);
            reactive(wgpuRenderPipeline).gpuRenderPipeline;

            const gpuRenderPipeline = wgpuRenderPipeline.gpuRenderPipeline;

            //
            this.setPipeline = ['setPipeline', gpuRenderPipeline];

            //
            const stencilReference = getStencilReference(r_renderObject.pipeline.depthStencil);
            if (stencilReference === undefined)
            {
                this.setStencilReference = null;
            }
            else
            {
                this.setStencilReference = ['setStencilReference', stencilReference];
            }

            //
            const blendConstantColor = BlendState.getBlendConstantColor(r_renderObject.pipeline.fragment?.targets?.[0]?.blend);
            if (blendConstantColor === undefined)
            {
                this.setBlendConstant = null;
            }
            else
            {
                this.setBlendConstant = ['setBlendConstant', blendConstantColor];
            }

            // 监听
            r_renderObject.bindingResources;

            // 执行
            const { bindingResources } = renderObject;
            const layout = WGPUPipelineLayout.getPipelineLayout({ vertex: r_renderObject.pipeline.vertex.code, fragment: r_renderObject.pipeline.fragment?.code });

            this.setBindGroup.length = layout.bindGroupLayouts.length;
            layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
            {
                const wgpuBindGroup = WGPUBindGroup.getInstance(device, bindGroupLayout, bindingResources);
                reactive(wgpuBindGroup).gpuBindGroup;

                const gpuBindGroup = wgpuBindGroup.gpuBindGroup;

                this.setBindGroup[group] = ['setBindGroup', group, gpuBindGroup];
            });

            // 监听
            r_renderObject.vertices;
            r_renderObject.pipeline.vertex;

            //
            const wgpuVertexBufferLayout = WGPUVertexBufferLayout.getInstance(pipeline.vertex, vertices);
            reactive(wgpuVertexBufferLayout).vertexBuffers;
            const vertexBuffers = wgpuVertexBufferLayout.vertexBuffers;

            this.setVertexBuffer.length = vertexBuffers?.length ?? 0;
            vertexBuffers?.forEach((vertexBuffer, index) =>
            {
                // 监听
                const r_vertexBuffer = reactive(vertexBuffer);

                r_vertexBuffer.data;
                r_vertexBuffer.offset;
                r_vertexBuffer.size;

                // 执行
                const { data, offset, size } = vertexBuffer;
                const buffer = Buffer.getBuffer(data);

                (buffer as any).label = buffer.label || (`顶点属性 ${autoVertexIndex++}`);

                const gBuffer = WGPUBuffer.getInstance(device, buffer).gpuBuffer;

                this.setVertexBuffer[index] = ['setVertexBuffer', index, gBuffer, offset, size];
            });

            // 监听
            r_renderObject.indices;

            if (!indices)
            {
                this.setIndexBuffer = null;

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
                this.setIndexBuffer = ['setIndexBuffer', gBuffer.gpuBuffer, indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16', indices.byteOffset, indices.byteLength];
            }

            const { draw } = reactive(renderObject);

            //
            this.draw = null;
            this.drawIndexed = null;
            if (draw.__type__ === 'DrawVertex')
            {
                this.draw = ['draw', draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance];
            }
            else
            {
                this.drawIndexed = ['drawIndexed', draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance];
            }
        });
    }

    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState)
    {
        const { setViewport, setScissorRect, setPipeline, setBlendConstant, setStencilReference, setBindGroup, setVertexBuffer, setIndexBuffer, draw, drawIndexed } = this;

        if (state.setViewport !== setViewport && setViewport)
        {
            commands.push(setViewport);
            state.setViewport = setViewport;
        }
        if (state.setScissorRect !== setScissorRect && setScissorRect)
        {
            commands.push(setScissorRect);
            state.setScissorRect = setScissorRect;
        }
        if (state.setBlendConstant !== setBlendConstant && setBlendConstant)
        {
            commands.push(setBlendConstant);
            state.setBlendConstant = setBlendConstant;
        }
        if (state.setStencilReference !== setStencilReference && setStencilReference)
        {
            commands.push(setStencilReference);
        }
        if (state.setPipeline !== setPipeline)
        {
            commands.push(setPipeline);
            state.setPipeline = setPipeline;
        }
        for (let i = 0, len = setBindGroup.length; i < len; i++)
        {
            if (state.setBindGroup[i] !== setBindGroup[i] && setBindGroup[i])
            {
                commands.push(setBindGroup[i]);
                state.setBindGroup[i] = setBindGroup[i];
            }
        }
        for (let i = 0, len = setVertexBuffer.length; i < len; i++)
        {
            if (state.setVertexBuffer[i] !== setVertexBuffer[i])
            {
                commands.push(setVertexBuffer[i]);
                state.setVertexBuffer[i] = setVertexBuffer[i];
            }
        }
        if (state.setIndexBuffer !== setIndexBuffer && setIndexBuffer)
        {
            commands.push(setIndexBuffer);
            state.setIndexBuffer = setIndexBuffer;
        }
        draw && commands.push(draw);
        drawIndexed && commands.push(drawIndexed);
    }

    static getInstance(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        return device.renderObjects?.get([renderObject, renderPassFormat]) || new WGPURenderObject(device, renderObject, renderPassFormat);
    }
}

declare global
{
    interface GPUDevice
    {
        renderObjects: ChainMap<[renderObject: RenderObject, renderPassFormat: RenderPassFormat], WGPURenderObject>;
    }
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