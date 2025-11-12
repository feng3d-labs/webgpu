import { reactive } from '@feng3d/reactivity';
import { Submit } from '@feng3d/render-api';
import { runCommandEncoder } from './runCommandEncoder';

export function runSubmit(device: GPUDevice, submit: Submit)
{
    reactive(device.queue).preSubmit = ~~device.queue.preSubmit + 1;

    const commandBuffers = submit.commandEncoders.map((v) =>
    {
        return runCommandEncoder(device, v);
    });

    device.queue.submit(commandBuffers);

    reactive(device.queue).afterSubmit = ~~device.queue.afterSubmit + 1;
}

declare global
{
    interface GPUQueue
    {
        preSubmit: number;
        afterSubmit: number;
    }
}