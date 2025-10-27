import { anyEmitter } from '@feng3d/event';
import { reactive } from '@feng3d/reactivity';
import { Submit } from '@feng3d/render-api';
import { GPUQueue_submit } from '../eventnames';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUCommandEncoder } from './WGPUCommandEncoder';

export class WGPUSubmit extends ReactiveObject
{
    commandBuffers: WGPUCommandEncoder[];

    constructor(device: GPUDevice, submit: Submit)
    {
        super();

        this._onCreate(device, submit);
        this._onMap(device, submit);
    }

    private _onCreate(device: GPUDevice, submit: Submit)
    {
        const r_submit = reactive(submit);

        this.effect(() =>
        {
            r_submit.commandEncoders.concat();

            this.commandBuffers = submit.commandEncoders.map((v) =>
            {
                const commandEncoderCommand = WGPUCommandEncoder.getInstance(device, v);

                return commandEncoderCommand;
            });
        });
    }

    run(device: GPUDevice)
    {
        const { commandBuffers } = this;

        reactive(device.queue).preSubmit = ~~device.queue.preSubmit + 1;

        device.queue.submit(commandBuffers.map((v) => v.run(device)));

        reactive(device.queue).afterSubmit = ~~device.queue.afterSubmit + 1;

        // 派发提交WebGPU事件
        anyEmitter.emit(device.queue, GPUQueue_submit);
    }

    private _onMap(device: GPUDevice, submit: Submit)
    {
        device.submitCommands ??= new WeakMap<Submit, WGPUSubmit>();
        device.submitCommands.set(submit, this);
        this.destroyCall(() => { device.submitCommands.delete(submit); });
    }

    static getInstance(device: GPUDevice, submit: Submit)
    {
        return device.submitCommands?.get(submit) || new WGPUSubmit(device, submit);
    }
}

declare global
{
    interface GPUDevice
    {
        submitCommands: WeakMap<Submit, WGPUSubmit>;
    }

    interface GPUQueue
    {
        preSubmit: number;
        afterSubmit: number;
    }
}