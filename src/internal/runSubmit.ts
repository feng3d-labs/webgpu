import { reactive } from '@feng3d/reactivity';
import { CanvasContext, Submit } from '@feng3d/render-api';
import { runCommandEncoder } from './runCommandEncoder';

export function runSubmit(device: GPUDevice, submit: Submit, canvasContext?: CanvasContext, autoFlipRTT?: boolean)
{
    reactive(device.queue).preSubmit = ~~device.queue.preSubmit + 1;

    const commandBuffers = submit.commandEncoders.map((v) =>
    {
        return runCommandEncoder(device, v, canvasContext, autoFlipRTT);
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