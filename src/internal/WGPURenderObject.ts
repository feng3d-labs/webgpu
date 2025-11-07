import { ChainMap, DrawIndexed, DrawVertex, RenderObject } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { getSetBindGroup } from './renderobject/getSetBindGroup';
import { getSetBlendConstant } from './renderobject/getSetBlendConstant';
import { getSetIndexBuffer } from './renderobject/getSetIndexBuffer';
import { getSetPipeline } from './renderobject/getSetPipeline';
import { getSetScissorRect } from './renderobject/getSetScissorRect';
import { getSetStencilReference } from './renderobject/getSetStencilReference';
import { getSetVertexBuffer } from './renderobject/getSetVertexBuffer';
import { getSetViewport } from './renderobject/getSetViewport';
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
        const computedSetViewport = getSetViewport(renderPassFormat, renderObject);

        const computedSetScissorRect = getSetScissorRect(renderPassFormat, renderObject);

        const computedSetPipeline = getSetPipeline(device, renderObject, renderPassFormat);

        const computedSetStencilReference = getSetStencilReference(renderObject);

        const computedSetBlendConstant = getSetBlendConstant(renderObject);

        const computedSetBindGroup = getSetBindGroup(device, renderObject);

        const computedSetVertexBuffer = getSetVertexBuffer(device, renderObject);

        const computedSetIndexBuffer = getSetIndexBuffer(device, renderObject);

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



