import { reactive } from '@feng3d/reactivity';
import { WGPUTimestampQuery } from '../caches/WGPUTimestampQuery';
import { ComputePass } from '../data/ComputePass';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUComputeObject } from './WGPUComputeObject';

export class WGPUComputePass extends ReactiveObject
{
    run: (device: GPUDevice, commandEncoder: GPUCommandEncoder) => void;

    constructor(device: GPUDevice, computePass: ComputePass)
    {
        super();

        this._onCreate(device, computePass);
        this._onMap(device, computePass);
    }

    private _onCreate(device: GPUDevice, computePass: ComputePass)
    {
        let computeObjectCommands: WGPUComputeObject[];

        const descriptor: GPUComputePassDescriptor = {};

        const r_computePass = reactive(computePass);
        this.effect(() =>
        {
            if (r_computePass.descriptor?.timestampQuery)
            {
                const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(device, computePass.descriptor.timestampQuery);
                reactive(wGPUTimestampQuery).gpuPassTimestampWrites;
                descriptor.timestampWrites = wGPUTimestampQuery.gpuPassTimestampWrites;
            }

            computeObjectCommands = computePass.computeObjects.map((computeObject) => WGPUComputeObject.getInstance(device, computeObject));
        });

        this.run = (device: GPUDevice, commandEncoder: GPUCommandEncoder) =>
        {
            //
            const passEncoder = commandEncoder.beginComputePass(descriptor);

            computeObjectCommands.forEach((command) => command.run(device, passEncoder));

            passEncoder.end();

            // 处理时间戳查询
            descriptor.timestampWrites?.resolve(commandEncoder);
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