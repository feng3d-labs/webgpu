import { anyEmitter } from '@feng3d/event';
import { reactive } from '@feng3d/reactivity';
import { Submit } from '@feng3d/render-api';
import { GPUQueue_submit } from '../eventnames';
import { ReactiveObject } from '../ReactiveObject';
import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';
import { WGPUCommandEncoder } from './WGPUCommandEncoder';

export class WGPUSubmit extends ReactiveObject
{
    commandBuffers: WGPUCommandEncoder[];

    constructor(public readonly webgpu: WebGPU, public readonly submit: Submit)
    {
        super();

        this._onCreate(webgpu.device, submit);
        this._onMap(webgpu.device, submit);
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

    private _onMap(device: GPUDevice, submit: Submit)
    {
        device.submitCommands ??= new WeakMap<Submit, WGPUSubmit>();
        device.submitCommands.set(submit, this);
        this.destroyCall(() => { device.submitCommands.delete(submit); });
    }

    static getInstance(webgpu: WebGPU, submit: Submit)
    {
        return webgpu.device.submitCommands?.get(submit) || new WGPUSubmit(webgpu, submit);
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