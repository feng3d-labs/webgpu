import { anyEmitter } from '@feng3d/event';
import { reactive } from '@feng3d/reactivity';
import { Submit } from '@feng3d/render-api';
import { GPUQueue_submit, webgpuEvents } from '../eventnames';
import { WebGPU } from '../WebGPU';
import { CommandEncoderCommand } from './CommandEncoderCommand';
import { GDeviceContext } from './GDeviceContext';

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

    run(context: GDeviceContext)
    {
        const { commandBuffers } = this;

        // 提交前数值加一，用于处理提交前需要执行的操作。
        reactive(webgpuEvents).preSubmit = webgpuEvents.preSubmit + 1;

        const { device } = context;

        device.queue.submit(commandBuffers.map((v) => v.run(context)));

        // 派发提交WebGPU事件
        anyEmitter.emit(device.queue, GPUQueue_submit);
    }

    commandBuffers: CommandEncoderCommand[];
}
