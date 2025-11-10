import { Color } from '@feng3d/render-api';
import { RenderPassFormat } from '../internal/RenderPassFormat';

export type CommandType =
    | [func: 'setViewport', args: [x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number]]
    | [func: 'setScissorRect', args: [x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate]]
    | [func: 'setPipeline', args: [pipeline: GPURenderPipeline]]
    | [func: 'setBindGroup', args: [index: number, bindGroup: GPUBindGroup]]
    | [func: 'setVertexBuffer', args: [slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64]]
    | [func: 'setIndexBuffer', args: [buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64]]
    | [func: 'draw', args: [vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32]]
    | [func: 'drawIndexed', args: [indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32]]
    | [func: 'setBlendConstant', args: [color: GPUColor]]
    | [func: 'setStencilReference', args: [reference: GPUStencilValue]]
    | [func: 'executeBundles', args: [bundles: GPURenderBundle[]]]
    | [func: 'beginOcclusionQuery', args: [queryIndex: GPUSize32]]
    | [func: 'endOcclusionQuery']
    ;

export class WGPURenderPassEncoder implements GPURenderPassEncoder
{
    commands: CommandType[] = [];
    _setViewport: [x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number] | undefined;
    _setScissorRect: [x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate] | undefined;
    _setBlendConstant: Color | undefined;
    _setPipeline: GPURenderPipeline;
    _setStencilReference: number | undefined;
    _setBindGroup: GPUBindGroup[] = [];
    _setVertexBuffer: [buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][] = [];
    _setIndexBuffer: [buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];

    constructor(public readonly renderPassFormat: RenderPassFormat, public readonly attachmentSize: { readonly width: number, readonly height: number })
    {
        this.renderPassFormat = renderPassFormat;
        this.attachmentSize = attachmentSize;
    }

    setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): undefined
    {
        const currentViewport = this._setViewport;
        if (currentViewport && x === currentViewport[0] && y === currentViewport[1] && width === currentViewport[2] && height === currentViewport[3] && minDepth === currentViewport[4] && maxDepth === currentViewport[5]) return;

        this.commands.push(['setViewport', [x, y, width, height, minDepth, maxDepth]]);
        this._setViewport = [x, y, width, height, minDepth, maxDepth];
    }

    setScissorRect(x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate): undefined
    {
        const currentScissorRect = this._setScissorRect;
        if (currentScissorRect && x === currentScissorRect[0] && y === currentScissorRect[1] && width === currentScissorRect[2] && height === currentScissorRect[3]) return;

        this.commands.push(['setScissorRect', [x, y, width, height]]);
        this._setScissorRect = [x, y, width, height];
    }

    setBlendConstant(blendConstant: Color | undefined): undefined
    {
        if (blendConstant === undefined) return;
        const currentBlendConstant = this._setBlendConstant;
        if (blendConstant === currentBlendConstant || (blendConstant && currentBlendConstant && blendConstant[0] === currentBlendConstant[0] && blendConstant[1] === currentBlendConstant[1] && blendConstant[2] === currentBlendConstant[2] && blendConstant[3] === currentBlendConstant[3])) return;

        this.commands.push(['setBlendConstant', [blendConstant]]);
        this._setBlendConstant = blendConstant;
    }

    setStencilReference(stencilReference: number | undefined): undefined
    {
        if (stencilReference === undefined) return;

        if (stencilReference === this._setStencilReference) return;

        this.commands.push(['setStencilReference', [stencilReference]]);
        this._setStencilReference = stencilReference;
    }

    setPipeline(pipeline: GPURenderPipeline): undefined
    {
        if (pipeline === undefined) return;

        if (pipeline === this._setPipeline) return;

        this.commands.push(['setPipeline', [pipeline]]);
        this._setPipeline = pipeline;
    }

    setBindGroup(i: GPUIndex32, bindGroup: GPUBindGroup): undefined
    {
        if (this._setBindGroup[i] !== bindGroup)
        {
            this.commands.push(['setBindGroup', [i, bindGroup]]);
            this._setBindGroup[i] = bindGroup;
        }
    }

    setVertexBuffer(i: GPUIndex32, buffer: GPUBuffer | null | undefined, offset?: GPUSize64, size?: GPUSize64): undefined
    {
        const currentVertexBuffer = this._setVertexBuffer[i];
        if (!currentVertexBuffer || currentVertexBuffer[0] !== buffer || currentVertexBuffer[1] !== offset || currentVertexBuffer[2] !== size)
        {
            this.commands.push(['setVertexBuffer', [i, buffer, offset, size]]);
            this._setVertexBuffer[i] = [buffer, offset, size];
        }
    }

    setIndexBuffer(buffer: GPUBuffer | null | undefined, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64): undefined
    {
        if (!this._setIndexBuffer || this._setIndexBuffer[0] !== buffer || this._setIndexBuffer[1] !== indexFormat || this._setIndexBuffer[2] !== offset || this._setIndexBuffer[3] !== size)
        {
            this.commands.push(['setIndexBuffer', [buffer, indexFormat, offset, size]]);
            this._setIndexBuffer = [buffer, indexFormat, offset, size];
        }
    }

    draw(vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32): undefined
    {
        this.commands.push(['draw', [vertexCount, instanceCount, firstVertex, firstInstance]]);
    }

    drawIndexed(indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32): undefined
    {
        this.commands.push(['drawIndexed', [indexCount, instanceCount, firstIndex, baseVertex, firstInstance]]);
    }

    executeBundles(bundles: GPURenderBundle[]): undefined
    {
        this.commands.push(['executeBundles', [bundles]]);
    }

    beginOcclusionQuery(queryIndex: GPUSize32): undefined
    {
        this.commands.push(['beginOcclusionQuery', [queryIndex]]);
    }

    endOcclusionQuery(): undefined
    {
        this.commands.push(['endOcclusionQuery']);
    }

    runCommands(renderBundleEncoder: GPURenderBundleEncoder | GPURenderPassEncoder)
    {
        const commands = this.commands;
        for (let i = 0, n = commands.length; i < n; i++)
        {
            const [func, args] = commands[i];

            (renderBundleEncoder[func] as Function).apply(renderBundleEncoder, args);
        }
    }

    //
    __brand: 'GPURenderPassEncoder';
    label: string;
    end(): undefined { throw new Error('Method not implemented.'); }
    pushDebugGroup(groupLabel: string): undefined { throw new Error('Method not implemented.'); }
    popDebugGroup(): undefined { throw new Error('Method not implemented.'); }
    insertDebugMarker(markerLabel: string): undefined { throw new Error('Method not implemented.'); }
    drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined { throw new Error('Method not implemented.'); }
    drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: GPUSize64): undefined { throw new Error('Method not implemented.'); }
}

export class WGPURenderBundleEncoder extends WGPURenderPassEncoder
{
    setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): undefined { }

    setScissorRect(x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate): undefined { }

    setBlendConstant(blendConstant: Color | undefined): undefined { }

    setStencilReference(stencilReference: number | undefined): undefined { }

    executeBundles(bundles: GPURenderBundle[]): undefined { }

    beginOcclusionQuery(queryIndex: GPUSize32): undefined { }

    endOcclusionQuery(): undefined { }
}
