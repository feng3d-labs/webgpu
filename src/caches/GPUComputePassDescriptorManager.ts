import { ComputePass } from '../data/ComputePass';
import { GPUPassTimestampWritesManager } from './GPUPassTimestampWritesManager';

export class GPUComputePassDescriptorManager
{
    static getGPUComputePassDescriptor(device: GPUDevice, computePass: ComputePass)
    {
        const descriptor: GPUComputePassDescriptor = {};

        if (computePass.descriptor?.timestampQuery)
        {
            descriptor.timestampWrites = GPUPassTimestampWritesManager.getGPUPassTimestampWrites(device, computePass.descriptor.timestampQuery);
        }

        return descriptor;
    }
}

