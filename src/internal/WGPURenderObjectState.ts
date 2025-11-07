import { Color, DrawIndexed, DrawVertex } from "@feng3d/render-api";
import { RenderPassFormat } from "./RenderPassFormat";

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
    _setViewport: [x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number] | undefined;
    _setScissorRect: [x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate] | undefined;
    _setBlendConstant: Color | undefined;
    _setPipeline: GPURenderPipeline;
    _setStencilReference: number | undefined;
    _setBindGroup: GPUBindGroup[] = [];
    _setVertexBuffer: [buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][] = [];
    _setIndexBuffer: [func: 'setIndexBuffer', buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
    _drawIndexed: [func: 'drawIndexed', indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32];

    constructor(private passEncoder: GPURenderPassEncoder, private renderPassFormat: RenderPassFormat)
    {

    }

    setViewport(viewport: [x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number])
    {
        const currentViewport = this._setViewport;
        if (viewport === currentViewport || (viewport && currentViewport && viewport[0] === currentViewport[0] && viewport[1] === currentViewport[1] && viewport[2] === currentViewport[2] && viewport[3] === currentViewport[3] && viewport[4] === currentViewport[4] && viewport[5] === currentViewport[5])) return;

        if (viewport)
        {
            this.commands.push(['setViewport', viewport[0], viewport[1], viewport[2], viewport[3], viewport[4], viewport[5]]);
        }
        else
        {
            this.commands.push(['setViewport', 0, 0, this.renderPassFormat.attachmentSize.width, this.renderPassFormat.attachmentSize.height, 0, 1]);
        }
        this._setViewport = viewport;
    }

    setScissorRect(scissorRect: [x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate] | undefined)
    {
        const currentScissorRect = this._setScissorRect;
        if (scissorRect === currentScissorRect || (scissorRect && currentScissorRect && scissorRect[0] === currentScissorRect[0] && scissorRect[1] === currentScissorRect[1] && scissorRect[2] === currentScissorRect[2] && scissorRect[3] === currentScissorRect[3])) return;
        if (scissorRect)
        {
            this.commands.push(['setScissorRect', scissorRect[0], scissorRect[1], scissorRect[2], scissorRect[3]]);
        }
        else
        {
            this.commands.push(['setScissorRect', 0, 0, this.renderPassFormat.attachmentSize.width, this.renderPassFormat.attachmentSize.height]);
        }
        this._setScissorRect = scissorRect;
    }

    setBlendConstant(blendConstant: Color | undefined)
    {
        if (blendConstant === undefined) return;
        const currentBlendConstant = this._setBlendConstant;
        if (blendConstant === currentBlendConstant || (blendConstant && currentBlendConstant && blendConstant[0] === currentBlendConstant[0] && blendConstant[1] === currentBlendConstant[1] && blendConstant[2] === currentBlendConstant[2] && blendConstant[3] === currentBlendConstant[3])) return;

        this.commands.push(['setBlendConstant', blendConstant]);
        this._setBlendConstant = blendConstant;
    }

    setStencilReference(stencilReference: number | undefined)
    {
        if (stencilReference === undefined) return;

        if (stencilReference === this._setStencilReference) return;

        this.commands.push(['setStencilReference', stencilReference]);
        this._setStencilReference = stencilReference;
    }

    setPipeline(pipeline: GPURenderPipeline)
    {
        if (pipeline === undefined) return;

        if (pipeline === this._setPipeline) return;

        this.commands.push(['setPipeline', pipeline]);
        this._setPipeline = pipeline;
    }

    setBindGroup(bindGroups: GPUBindGroup[])
    {
        for (let i = 0, len = bindGroups.length; i < len; i++)
        {
            if (this._setBindGroup[i] !== bindGroups[i])
            {
                this.commands.push(['setBindGroup', i, bindGroups[i]]);
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
                this.commands.push(['setVertexBuffer', i, vertexBuffer[0], vertexBuffer[1], vertexBuffer[2]]);
                this._setVertexBuffer[i] = vertexBuffer;
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

export function runCommands(renderBundleEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, commands: CommandType[])
{
    for (let i = 0, n = commands.length; i < n; i++)
    {
        const command = commands[i] as [func: string, ...args: any[]];

        switch (command.length)
        {
            case 1:
                renderBundleEncoder[command[0]]();
                break;
            case 2:
                renderBundleEncoder[command[0]](command[1]);
                break;
            case 3:
                renderBundleEncoder[command[0]](command[1], command[2]);
                break;
            case 4:
                renderBundleEncoder[command[0]](command[1], command[2], command[3]);
                break;
            case 5:
                renderBundleEncoder[command[0]](command[1], command[2], command[3], command[4]);
                break;
            case 6:
                renderBundleEncoder[command[0]](command[1], command[2], command[3], command[4], command[5]);
                break;
            case 7:
                renderBundleEncoder[command[0]](command[1], command[2], command[3], command[4], command[5], command[6]);
                break;
            case 8:
                renderBundleEncoder[command[0]](command[1], command[2], command[3], command[4], command[5], command[6], command[7]);
                break;
            case 9:
                renderBundleEncoder[command[0]](command[1], command[2], command[3], command[4], command[5], command[6], command[7], command[8]);
                break;
            default:
                console.error(`未处理命令 ${command}`);
                break;
        }
    }
}