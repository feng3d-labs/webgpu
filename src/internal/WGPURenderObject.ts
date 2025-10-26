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

export class WGPURenderObject implements RenderPassObjectCommand
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

    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObject)
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
    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObject): void;
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
