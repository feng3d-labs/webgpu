import { anyEmitter } from '@feng3d/event';
import { computed, reactive } from '@feng3d/reactivity';
import { ChainMap, Submit } from '@feng3d/render-api';
import { GPUQueue_submit } from '../eventnames';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUCommandEncoder } from './WGPUCommandEncoder';

export class WGPUSubmit extends ReactiveObject
{
    constructor(device: GPUDevice, submit: Submit)
    {
        super();

        this._onCreate(device, submit);
        //
        WGPUSubmit.map.set([device, submit], this);
        this.destroyCall(() => { WGPUSubmit.map.delete([device, submit]); });
    }

    private _onCreate(device: GPUDevice, submit: Submit)
    {
        const r_submit = reactive(submit);

        const computedCommandBuffers = computed(() =>
        {
            r_submit.commandEncoders.concat();

            const commandBuffers = submit.commandEncoders.map((v) =>
            {
                const commandEncoderCommand = WGPUCommandEncoder.getInstance(device, v);

                return commandEncoderCommand;
            });

            return commandBuffers;
        });

        this.run = (device: GPUDevice) =>
        {
            const commandBuffers = computedCommandBuffers.value;

            reactive(device.queue).preSubmit = ~~device.queue.preSubmit + 1;

            device.queue.submit(commandBuffers.map((v) => v.run(device)));

            reactive(device.queue).afterSubmit = ~~device.queue.afterSubmit + 1;

            // 派发提交WebGPU事件
            anyEmitter.emit(device.queue, GPUQueue_submit);
        }
    }

    run: (device: GPUDevice) => void;

    static getInstance(device: GPUDevice, submit: Submit)
    {
        return WGPUSubmit.map.get([device, submit]) || new WGPUSubmit(device, submit);
    }
    private static readonly map = new ChainMap<[GPUDevice, Submit], WGPUSubmit>();
}

declare global
{
    interface GPUQueue
    {
        preSubmit: number;
        afterSubmit: number;
    }
}