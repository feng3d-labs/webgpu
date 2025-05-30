import { anyEmitter } from '@feng3d/event';
import { effect, reactive } from '@feng3d/reactivity';
import { ChainMap, CommandEncoder, RenderPass, Submit } from '@feng3d/render-api';
import { GPUBindGroupManager } from '../caches/GPUBindGroupManager';
import { GPUComputePassDescriptorManager } from '../caches/GPUComputePassDescriptorManager';
import { GPUComputePipelineManager } from '../caches/GPUComputePipelineManager';
import { GPUPipelineLayoutManager } from '../caches/GPUPipelineLayoutManager';
import { GPURenderPassDescriptorManager } from '../caches/GPURenderPassDescriptorManager';
import { GPURenderPassFormatManager } from '../caches/GPURenderPassFormatManager';
import { ComputeObject } from '../data/ComputeObject';
import { ComputePass } from '../data/ComputePass';
import { GPUQueue_submit, webgpuEvents } from '../eventnames';
import { WebGPU } from '../WebGPU';

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

export class OcclusionQueryCache implements RenderPassObjectCommand
{
    queryIndex: number;
    renderObjectCaches: RenderObjectCache[];

    run(device: GPUDevice, commands: CommandType[], state: RenderObjectCache)
    {
        commands.push(['beginOcclusionQuery', this.queryIndex]);
        for (let i = 0, len = this.renderObjectCaches.length; i < len; i++)
        {
            this.renderObjectCaches[i].run(undefined, commands, state);
        }
        commands.push(['endOcclusionQuery']);
    }
}

export interface RenderPassObjectCommand
{
    run(device: GPUDevice, commands: CommandType[], state: RenderObjectCache): void;
}

export class RenderBundleCommand implements RenderPassObjectCommand
{
    gpuRenderBundle: GPURenderBundle;
    descriptor: GPURenderBundleEncoderDescriptor;
    bundleCommands: CommandType[];
    run(device: GPUDevice, commands: CommandType[], state: RenderObjectCache): void
    {
        if (!this.gpuRenderBundle)
        {
            //
            const renderBundleEncoder = device.createRenderBundleEncoder(this.descriptor);

            runCommands(renderBundleEncoder, this.bundleCommands);

            this.gpuRenderBundle = renderBundleEncoder.finish();
        }

        commands.push(['executeBundles', [this.gpuRenderBundle]]);
    }
}

export interface PassEncoderCommand
{
    run(commandEncoder: GPUCommandEncoder): void;
}

export class RenderPassCommand
{
    static getInstance(webgpu: WebGPU, renderPass: RenderPass)
    {
        return new RenderPassCommand(webgpu, renderPass);
    }

    constructor(public readonly webgpu: WebGPU, public readonly renderPass: RenderPass)
    {
        effect(() =>
        {
            const r_renderPass = reactive(renderPass);

            r_renderPass.renderPassObjects;
            r_renderPass.descriptor;

            const { descriptor, renderPassObjects } = renderPass;

            this.renderPassDescriptor = GPURenderPassDescriptorManager.getGPURenderPassDescriptor(webgpu.device, renderPass);

            const renderPassFormat = GPURenderPassFormatManager.getGPURenderPassFormat(descriptor);

            const renderPassObjectCommands = webgpu.runRenderPassObjects(renderPassFormat, renderPassObjects);
            const commands: CommandType[] = [];
            const state = new RenderObjectCache();

            renderPassObjectCommands?.forEach((command) =>
            {
                command.run(webgpu.device, commands, state);
            });
            this.commands = commands;
        });
    }

    run(commandEncoder: GPUCommandEncoder)
    {
        const { renderPassDescriptor, commands } = this;
        const { device } = commandEncoder;

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        passEncoder.device = device;

        runCommands(passEncoder, commands);
        passEncoder.end();

        renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
        renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
    }

    renderPassDescriptor: GPURenderPassDescriptor;
    commands: CommandType[];
}

export class ComputeObjectCommand
{
    static getInstance(webgpu: WebGPU, computeObject: ComputeObject)
    {
        return new ComputeObjectCommand(webgpu, computeObject);
    }

    constructor(public readonly webgpu: WebGPU, public readonly computeObject: ComputeObject)
    {
        const device = this.webgpu.device;
        const { pipeline, bindingResources, workgroups } = computeObject;

        this.computePipeline = GPUComputePipelineManager.getGPUComputePipeline(device, pipeline);

        // 计算 bindGroups
        this.setBindGroup = [];
        const layout = GPUPipelineLayoutManager.getPipelineLayout({ compute: pipeline.compute.code });

        layout.bindGroupLayouts.forEach((bindGroupLayout, group) =>
        {
            const gpuBindGroup: GPUBindGroup = GPUBindGroupManager.getGPUBindGroup(device, bindGroupLayout, bindingResources);

            this.setBindGroup.push([group, gpuBindGroup]);
        });

        this.dispatchWorkgroups = [workgroups.workgroupCountX, workgroups.workgroupCountY, workgroups.workgroupCountZ];
    }

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
    static getInstance(webgpu: WebGPU, computePass: ComputePass)
    {
        return new ComputePassCommand(webgpu, computePass);
    }

    constructor(public readonly webgpu: WebGPU, public readonly computePass: ComputePass)
    {
        this.descriptor = GPUComputePassDescriptorManager.getGPUComputePassDescriptor(webgpu.device, computePass);
        this.computeObjectCommands = computePass.computeObjects.map((computeObject) => ComputeObjectCommand.getInstance(webgpu, computeObject));
    }

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
            source, sourceOffset, destination, destinationOffset, size,
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
    static getInstance(webgpu: WebGPU, commandEncoder: CommandEncoder)
    {
        return new CommandEncoderCommand(webgpu, commandEncoder);
    }

    constructor(public readonly webgpu: WebGPU, public readonly commandEncoder: CommandEncoder)
    {
        this.passEncoders = commandEncoder.passEncoders.map((passEncoder) =>
        {
            if (!passEncoder.__type__)
            {
                const renderPassCommand = RenderPassCommand.getInstance(this.webgpu, passEncoder as RenderPass);

                return renderPassCommand;
            }
            else if (passEncoder.__type__ === 'RenderPass')
            {
                const renderPassCommand = RenderPassCommand.getInstance(this.webgpu, passEncoder);

                return renderPassCommand;
            }
            else if (passEncoder.__type__ === 'ComputePass')
            {
                const computePassCommand = ComputePassCommand.getInstance(this.webgpu, passEncoder);

                return computePassCommand;
            }
            else if (passEncoder.__type__ === 'CopyTextureToTexture')
            {
                return this.webgpu.runCopyTextureToTexture(passEncoder);
            }
            else if (passEncoder.__type__ === 'CopyBufferToBuffer')
            {
                return this.webgpu.runCopyBufferToBuffer(passEncoder);
            }

            console.error(`未处理 passEncoder ${passEncoder}`);

            return null;
        });
    }

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
    static getInstance(webgpu: WebGPU, submit: Submit)
    {
        return new SubmitCommand(webgpu, submit);
    }

    constructor(public readonly webgpu: WebGPU, public readonly submit: Submit)
    {
        this.commandBuffers = submit.commandEncoders.map((v) =>
        {
            const commandEncoderCommand = CommandEncoderCommand.getInstance(this.webgpu, v);

            return commandEncoderCommand;
        });
    }

    run(device: GPUDevice)
    {
        const { commandBuffers } = this;

        // 提交前数值加一，用于处理提交前需要执行的操作。
        reactive(webgpuEvents).preSubmit = webgpuEvents.preSubmit + 1;

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