import { anyEmitter } from '@feng3d/event';
import { reactive } from '@feng3d/reactivity';
import { Submit } from '@feng3d/render-api';
import { GPUQueue_submit } from '../eventnames';
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

        const { device } = context;

        reactive(device.queue).preSubmit = ~~device.queue.preSubmit + 1;

        device.queue.submit(commandBuffers.map((v) => v.run(context)));

        reactive(device.queue).afterSubmit = ~~device.queue.afterSubmit + 1;

        // 派发提交WebGPU事件
        anyEmitter.emit(device.queue, GPUQueue_submit);
    }

    commandBuffers: CommandEncoderCommand[];
}

declare global
{
    interface GPUQueue
    {
        preSubmit: number;
        afterSubmit: number;
    }
}