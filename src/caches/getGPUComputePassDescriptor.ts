import { ComputePass } from "../data/ComputePass";
import { getGPUPassTimestampWrites } from "./getGPUPassTimestampWrites";

export function getGPUComputePassDescriptor(device: GPUDevice, computePass: ComputePass)
{
    const descriptor: GPUComputePassDescriptor = {};

    if (computePass.descriptor?.timestampQuery)
    {
        descriptor.timestampWrites = getGPUPassTimestampWrites(device, computePass.descriptor.timestampQuery);
    }

    return descriptor;
}
