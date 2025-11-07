import { Computed, computed, reactive } from "@feng3d/reactivity";
import { Color, DrawIndexed, DrawVertex } from "@feng3d/render-api";
import { RenderPassFormat } from "./RenderPassFormat";

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

export class WGPURenderObjectState
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

    private _computedDefaultViewport: Computed<[x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number]>;
    private _computedDefaultScissorRect: Computed<[x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate]>;
    constructor(private passEncoder: GPURenderPassEncoder, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
    {
        const r_renderPassFormat = reactive(renderPassFormat);
        this._computedDefaultViewport = computed(() =>
        {
            return [0, 0, attachmentSize.width, attachmentSize.height, 0, 1];
        })

        this._computedDefaultScissorRect = computed(() =>
        {
            return [0, 0, attachmentSize.width, attachmentSize.height];
        })
    }

    setViewport(viewport: [x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number])
    {
        const currentViewport = this._setViewport;
        if (viewport === currentViewport || (viewport && currentViewport && viewport[0] === currentViewport[0] && viewport[1] === currentViewport[1] && viewport[2] === currentViewport[2] && viewport[3] === currentViewport[3] && viewport[4] === currentViewport[4] && viewport[5] === currentViewport[5])) return;
        if (viewport)
        {
            this.commands.push(['setViewport', viewport]);
        }
        else
        {
            this.commands.push(['setViewport', this._computedDefaultViewport.value]);
        }
        this._setViewport = viewport;
    }

    setScissorRect(scissorRect: [x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate] | undefined)
    {
        const currentScissorRect = this._setScissorRect;
        if (scissorRect === currentScissorRect || (scissorRect && currentScissorRect && scissorRect[0] === currentScissorRect[0] && scissorRect[1] === currentScissorRect[1] && scissorRect[2] === currentScissorRect[2] && scissorRect[3] === currentScissorRect[3])) return;
        if (scissorRect)
        {
            this.commands.push(['setScissorRect', scissorRect]);
        }
        else
        {
            this.commands.push(['setScissorRect', this._computedDefaultScissorRect.value]);
        }
        this._setScissorRect = scissorRect;
    }

    setBlendConstant(blendConstant: Color | undefined)
    {
        if (blendConstant === undefined) return;
        const currentBlendConstant = this._setBlendConstant;
        if (blendConstant === currentBlendConstant || (blendConstant && currentBlendConstant && blendConstant[0] === currentBlendConstant[0] && blendConstant[1] === currentBlendConstant[1] && blendConstant[2] === currentBlendConstant[2] && blendConstant[3] === currentBlendConstant[3])) return;

        this.commands.push(['setBlendConstant', [blendConstant]]);
        this._setBlendConstant = blendConstant;
    }

    setStencilReference(stencilReference: number | undefined)
    {
        if (stencilReference === undefined) return;

        if (stencilReference === this._setStencilReference) return;

        this.commands.push(['setStencilReference', [stencilReference]]);
        this._setStencilReference = stencilReference;
    }

    setPipeline(pipeline: GPURenderPipeline)
    {
        if (pipeline === undefined) return;

        if (pipeline === this._setPipeline) return;

        this.commands.push(['setPipeline', [pipeline]]);
        this._setPipeline = pipeline;
    }

    setBindGroup(bindGroups: GPUBindGroup[])
    {
        for (let i = 0, len = bindGroups.length; i < len; i++)
        {
            if (this._setBindGroup[i] !== bindGroups[i])
            {
                this.commands.push(['setBindGroup', [i, bindGroups[i]]]);
                this._setBindGroup[i] = bindGroups[i];
            }
        }
    }

    setVertexBuffer(vertexBuffers: [buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][])
    {
        if (vertexBuffers === undefined) return;

        for (let i = 0, len = vertexBuffers.length; i < len; i++)
        {
            const currentVertexBuffer = this._setVertexBuffer[i];
            const vertexBuffer = vertexBuffers[i];
            if (!currentVertexBuffer || currentVertexBuffer[0] !== vertexBuffer[0] || currentVertexBuffer[1] !== vertexBuffer[1] || currentVertexBuffer[2] !== vertexBuffer[2])
            {
                this.commands.push(['setVertexBuffer', [i, vertexBuffer[0], vertexBuffer[1], vertexBuffer[2]]]);
                this._setVertexBuffer[i] = vertexBuffer;
            }
        }
    }

    setIndexBuffer(indexBuffer: [buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64])
    {
        if (indexBuffer === undefined) return;

        if (!this._setIndexBuffer || this._setIndexBuffer[0] !== indexBuffer[0] || this._setIndexBuffer[1] !== indexBuffer[1] || this._setIndexBuffer[2] !== indexBuffer[2] || this._setIndexBuffer[3] !== indexBuffer[3])
        {
            this.commands.push(['setIndexBuffer', [indexBuffer[0], indexBuffer[1], indexBuffer[2], indexBuffer[3]]]);
            this._setIndexBuffer = indexBuffer;
        }
    }

    draw(draw: DrawVertex | DrawIndexed)
    {
        //
        if (draw.__type__ === 'DrawVertex')
        {
            this.commands.push(['draw', [draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance]]);
        }
        else
        {
            this.commands.push(['drawIndexed', [draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance]]);
        }
    }
}

export function runCommands(renderBundleEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, commands: CommandType[])
{
    for (let i = 0, n = commands.length; i < n; i++)
    {
        const [func, args] = commands[i];

        (renderBundleEncoder[func] as Function).apply(renderBundleEncoder, args);
    }
}