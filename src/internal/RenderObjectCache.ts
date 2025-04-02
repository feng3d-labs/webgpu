import { anyEmitter } from "@feng3d/event";
import { ChainMap, reactive } from "@feng3d/render-api";
import { GPUQueue_submit, webgpuEvents } from "../eventnames";

const cache = new ChainMap();

function setVaule<T extends Array<any>>(cache: ChainMap<any[], any>, keys: T): T
{
    const v = cache.get(keys);
    if (v) return v;
    cache.set(keys, keys);
    return keys;
}

export type CommandType =
    | [func: "setViewport", x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number]
    | [func: "setScissorRect", x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate]
    | [func: "setPipeline", pipeline: GPURenderPipeline]
    | [func: "setBindGroup", index: number, bindGroup: GPUBindGroup]
    | [func: "setVertexBuffer", slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64]
    | [func: "setIndexBuffer", buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64]
    | [func: "draw", vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32]
    | [func: "drawIndexed", indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32]
    | [func: "setBlendConstant", color: GPUColor]
    | [func: "setStencilReference", reference: GPUStencilValue]
    | [func: "executeBundles", bundles: GPURenderBundle[]]
    | [func: "beginOcclusionQuery", queryIndex: GPUSize32]
    | [func: "endOcclusionQuery"]
    ;

export class RenderObjectCache implements RenderPassObjectCommand
{
    protected setViewport?: [func: "setViewport", x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number];
    protected setScissorRect?: [func: "setScissorRect", x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate];
    protected setPipeline: [func: "setPipeline", pipeline: GPURenderPipeline];
    protected setBlendConstant?: [func: "setBlendConstant", color: GPUColor];
    protected setStencilReference?: [func: "setStencilReference", reference: GPUStencilValue];
    protected setBindGroup?: [func: "setBindGroup", index: number, bindGroup: GPUBindGroup][] = [];
    protected setVertexBuffer?: [func: "setVertexBuffer", slot: GPUIndex32, buffer: GPUBuffer, offset?: GPUSize64, size?: GPUSize64][] = [];
    protected setIndexBuffer?: [func: "setIndexBuffer", buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: GPUSize64, size?: GPUSize64];
    protected draw?: [func: "draw", vertexCount: GPUSize32, instanceCount?: GPUSize32, firstVertex?: GPUSize32, firstInstance?: GPUSize32];
    protected drawIndexed?: [func: "drawIndexed", indexCount: GPUSize32, instanceCount?: GPUSize32, firstIndex?: GPUSize32, baseVertex?: GPUSignedOffset32, firstInstance?: GPUSize32];

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
        if (func === "setBindGroup")
        {
            this.setBindGroup[command[1]] = command;
            return;
        }
        else if (func === "setVertexBuffer")
        {
            this.setVertexBuffer[command[1]] = command;
            return;
        }
        command = setVaule(cache, command);
        this[command[0]] = command as any;
    }

    delete(func: CommandType[0])
    {
        if (func === "setBindGroup")
        {
            this.setBindGroup = [];
            return;
        }
        else if (func === "setVertexBuffer")
        {
            this.setVertexBuffer = [];
            return;
        }
        this[func as any] = undefined;
    }

    run(renderPass: GPURenderPassEncoder | GPURenderBundleEncoder, commands: CommandType[], state: RenderObjectCache)
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

export class OcclusionQueryCache implements RenderPassObjectCommand
{
    queryIndex: number;
    renderObjectCaches: RenderObjectCache[];

    run(passEncoder: GPURenderPassEncoder, commands: CommandType[], state: RenderObjectCache)
    {
        commands.push(["beginOcclusionQuery", this.queryIndex]);
        for (let i = 0, len = this.renderObjectCaches.length; i < len; i++)
        {
            this.renderObjectCaches[i].run(undefined, commands, state);
        }
        commands.push(["endOcclusionQuery"]);
    }
}

export interface RenderPassObjectCommand
{
    run(renderPass: GPURenderPassEncoder | GPURenderBundleEncoder, commands: CommandType[], state: RenderObjectCache): void;
}

export class RenderBundleCommand implements RenderPassObjectCommand
{
    gpuRenderBundle: GPURenderBundle;
    descriptor: GPURenderBundleEncoderDescriptor;
    bundleCommands: CommandType[];
    run(passEncoder: GPURenderPassEncoder, commands: CommandType[], state: RenderObjectCache): void
    {
        if (!this.gpuRenderBundle)
        {
            //
            const renderBundleEncoder = passEncoder.device.createRenderBundleEncoder(this.descriptor);

            runCommands(renderBundleEncoder, this.bundleCommands);

            this.gpuRenderBundle = renderBundleEncoder.finish();
        }

        commands.push(["executeBundles", [this.gpuRenderBundle]]);
    }
}

export interface PassEncoderCommand
{
    run(commandEncoder: GPUCommandEncoder): void;
}

export class RenderPassCommand
{
    run(commandEncoder: GPUCommandEncoder)
    {
        const { renderPassDescriptor, renderPassObjects } = this;
        const { device } = commandEncoder;

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.device = device;

        const commands: CommandType[] = [];
        const state = new RenderObjectCache();
        renderPassObjects?.forEach((command) =>
        {
            command.run(passEncoder, commands, state);
        });
        runCommands(passEncoder, commands);
        passEncoder.end();

        renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
        renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
    }
    renderPassDescriptor: GPURenderPassDescriptor;
    renderPassObjects: RenderPassObjectCommand[];
}

export class ComputeObjectCommand
{
    run(passEncoder: GPUComputePassEncoder)
    {
        passEncoder.setPipeline(this.computePipeline);
        this.setBindGroup.forEach(([index, bindGroup]) =>
        {
            passEncoder.setBindGroup(index, bindGroup);
        });
        const [workgroupCountX, workgroupCountY, workgroupCountZ] = this.dispatchWorkgroups;
        passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
    }
    computePipeline: GPUComputePipeline;
    setBindGroup: [index: GPUIndex32, bindGroup: GPUBindGroup][];
    dispatchWorkgroups: [workgroupCountX: GPUSize32, workgroupCountY?: GPUSize32, workgroupCountZ?: GPUSize32];
}

export class ComputePassCommand
{
    run(commandEncoder: GPUCommandEncoder)
    {
        const { descriptor, computeObjectCommands } = this;
        //
        const passEncoder = commandEncoder.beginComputePass(descriptor);
        computeObjectCommands.forEach((command) => command.run(passEncoder));
        passEncoder.end();
        // 处理时间戳查询
        descriptor.timestampWrites?.resolve(commandEncoder);
    }
    descriptor: GPUComputePassDescriptor;
    computeObjectCommands: ComputeObjectCommand[];
}

export class CopyTextureToTextureCommand
{
    run(commandEncoder: GPUCommandEncoder)
    {
        const { source, destination, copySize } = this;

        commandEncoder.copyTextureToTexture(
            source,
            destination,
            copySize,
        );
    }
    source: GPUImageCopyTexture;
    destination: GPUImageCopyTexture;
    copySize: GPUExtent3DStrict;
}

export class CopyBufferToBufferCommand
{
    run(commandEncoder: GPUCommandEncoder)
    {
        const { source, sourceOffset, destination, destinationOffset, size } = this;

        commandEncoder.copyBufferToBuffer(
            source, sourceOffset, destination, destinationOffset, size
        );
    }
    source: GPUBuffer;
    sourceOffset: number;
    destination: GPUBuffer;
    destinationOffset: number;
    size: number;
}

export class CommandEncoderCommand
{
    run(device: GPUDevice)
    {
        const gpuCommandEncoder = device.createCommandEncoder();
        gpuCommandEncoder.device = device;
        this.passEncoders.forEach((passEncoder) => passEncoder.run(gpuCommandEncoder));
        return gpuCommandEncoder.finish();
    }
    passEncoders: (RenderPassCommand | ComputePassCommand | CopyTextureToTextureCommand | CopyBufferToBufferCommand)[];
}

export class SubmitCommand
{
    run(device: GPUDevice)
    {
        const { commandBuffers } = this;

        // 提交前数值加一，用于处理提交前需要执行的操作。
        reactive(webgpuEvents).preSubmit = ~~reactive(webgpuEvents).preSubmit + 1;

        device.queue.submit(commandBuffers.map((v) => v.run(device)));

        // 派发提交WebGPU事件
        anyEmitter.emit(device.queue, GPUQueue_submit);
    }
    commandBuffers: CommandEncoderCommand[];
}

function runCommands(renderBundleEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, commands: CommandType[])
{
    for (let i = 0, n = commands.length; i < n; i++)
    {
        const command = commands[i];
        if (command[0] === "setBindGroup")
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