import { ChainMap } from '@feng3d/render-api';
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
        //
        WGPUComputePass.map.set([device, computePass], this);
        this.destroyCall(() => { WGPUComputePass.map.delete([device, computePass]); });
    }

    private _onCreate(device: GPUDevice, computePass: ComputePass)
    {
        this.run = (device: GPUDevice, commandEncoder: GPUCommandEncoder) =>
        {
            const descriptor: GPUComputePassDescriptor = {};
            if (computePass.descriptor?.timestampQuery)
            {
                const wGPUTimestampQuery = WGPUTimestampQuery.getInstance(device, computePass.descriptor.timestampQuery);
                descriptor.timestampWrites = wGPUTimestampQuery.gpuPassTimestampWrites;
            }
            //
            const passEncoder = commandEncoder.beginComputePass(descriptor);

            computePass.computeObjects.forEach((computeObject) =>
            {
                const wGPUComputeObject = WGPUComputeObject.getInstance(device, computeObject);
                wGPUComputeObject.run(device, passEncoder);
            })

            passEncoder.end();

            // 处理时间戳查询
            descriptor.timestampWrites?.resolve(commandEncoder);
        }
    }

    static getInstance(device: GPUDevice, computePass: ComputePass)
    {
        return this.map.get([device, computePass]) || new WGPUComputePass(device, computePass);
    }
    static readonly map = new ChainMap<[GPUDevice, ComputePass], WGPUComputePass>();
}