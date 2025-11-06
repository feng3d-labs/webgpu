import { anyEmitter } from '@feng3d/event';
import { reactive } from '@feng3d/reactivity';
import { Submit } from '@feng3d/render-api';
import { GPUQueue_submit } from '../eventnames';
import { WGPUCommandEncoder } from './WGPUCommandEncoder';

export function runSubmit(device: GPUDevice, submit: Submit)
{
    reactive(device.queue).preSubmit = ~~device.queue.preSubmit + 1;

    const commandBuffers = submit.commandEncoders.map((v) =>
    {
        const commandEncoderCommand = WGPUCommandEncoder.getInstance(device, v);

        return commandEncoderCommand.run(device);
    });

    device.queue.submit(commandBuffers);

    reactive(device.queue).afterSubmit = ~~device.queue.afterSubmit + 1;

    // 派发提交WebGPU事件
    anyEmitter.emit(device.queue, GPUQueue_submit);

}

declare global
{
    interface GPUQueue
    {
        preSubmit: number;
        afterSubmit: number;
    }
}