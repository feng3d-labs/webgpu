import { ChainMap } from '@feng3d/render-api';

const cache = new ChainMap();

function setVaule<T extends Array<any>>(cache: ChainMap<any[], any>, keys: T): T
{
    const v = cache.get(keys);

    if (v) return v;
    cache.set(keys, keys);

    return keys;
}

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

export class RenderObjectCache implements RenderPassObjectCommand
{
    protected setViewport?: [func: 'setViewport', x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number];
    protected setScissorRect?: [func: 'setScissorRect', x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate];
    protected setPipeline: [func: 'setPipeline', pipeline: GPURenderPipeline];
    protected setBlendConstant?: [func: 'setBlendConstant', color: GPUColor];
    protected setStencilReference?: [func: 'setStencilReference', reference: GPUStencilValue];
    protected setBindGroup?: [func: 'setBindGroup', index: number, bindGroup: GPUBindGroup][] = [];
    protected setVertexBuffer?: [func: 'setVertexBuffer', slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][] = [];
    protected setIndexBuffer?: [func: 'setIndexBuffer', buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
    protected draw?: [func: 'draw', vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32];
    protected drawIndexed?: [func: 'drawIndexed', indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32];

    push(command: CommandType)
    {
        let command1 = commandMap.get(command);

        if (!command1)
        {
            command1 = command;
            commandMap.set(command, command1);
        }
        else
        {
            command = command1;
        }

        const func = command[0];

        if (func === 'setBindGroup')
        {
            this.setBindGroup[command[1]] = command;

            return;
        }
        else if (func === 'setVertexBuffer')
        {
            this.setVertexBuffer[command[1]] = command;

            return;
        }
        command = setVaule(cache, command);
        this[command[0]] = command as any;
    }

    delete(func: CommandType[0])
    {
        if (func === 'setBindGroup')
        {
            this.setBindGroup = [];

            return;
        }
        else if (func === 'setVertexBuffer')
        {
            this.setVertexBuffer = [];

            return;
        }
        this[func as any] = undefined;
    }

    run(device: GPUDevice, commands: CommandType[], state: RenderObjectCache)
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
}

export interface RenderPassObjectCommand
{
    run(device: GPUDevice, commands: CommandType[], state: RenderObjectCache): void;
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

const commandMap = new ChainMap<CommandType, CommandType>();
