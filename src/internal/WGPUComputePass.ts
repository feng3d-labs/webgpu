import { reactive } from '@feng3d/reactivity';
import { ComputePass } from '../data/ComputePass';
import { ReactiveObject } from '../ReactiveObject';
import { ComputeObjectCommand } from './ComputeObjectCommand';
import { GDeviceContext } from './GDeviceContext';
import { WGPUComputePassDescriptor } from './WGPUComputePassDescriptor';

export class WGPUComputePass extends ReactiveObject
{
    run: (context: GDeviceContext) => void;

    constructor(device: GPUDevice, computePass: ComputePass)
    {
        super();

        this._onCreate(device, computePass);
        this._onMap(device, computePass);
    }

    private _onCreate(device: GPUDevice, computePass: ComputePass)
    {

        let wgpuComputePassDescriptor: WGPUComputePassDescriptor;
        let computeObjectCommands: ComputeObjectCommand[];

        this.effect(() =>
        {
            wgpuComputePassDescriptor = new WGPUComputePassDescriptor(device, computePass);
            reactive(wgpuComputePassDescriptor).descriptor;

            computeObjectCommands = computePass.computeObjects.map((computeObject) => ComputeObjectCommand.getInstance(device, computeObject));
        });

        this.run = (context: GDeviceContext) =>
        {
            //
            wgpuComputePassDescriptor.run(context);

            computeObjectCommands.forEach((command) => command.run(context));

            wgpuComputePassDescriptor.end(context);
        }
    }

    private _onMap(device: GPUDevice, computePass: ComputePass)
    {
        device.computePasses ??= new WeakMap<ComputePass, WGPUComputePass>();
        device.computePasses.set(computePass, this);
        this.destroyCall(() => { device.computePasses.delete(computePass); });
    }

    static getInstance(device: GPUDevice, computePass: ComputePass)
    {
        return device.computePasses?.get(computePass) || new WGPUComputePass(device, computePass);
    }
}

declare global
{
    interface GPUDevice
    {
        computePasses: WeakMap<ComputePass, WGPUComputePass>;
    }
}