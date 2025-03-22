import { ComputePass } from "../data/ComputePass";
import { getGPUPassTimestampWrites } from "./getGPUPassTimestampWrites";

export function getGPUComputePassDescriptor(commandEncoder: GPUCommandEncoder, computePass: ComputePass)
{
    const descriptor: GPUComputePassDescriptor = {};

    const device = commandEncoder.device;

    if (computePass.descriptor?.timestampQuery)
    {
        descriptor.timestampWrites = getGPUPassTimestampWrites(device, computePass.descriptor.timestampQuery);
    }

    return descriptor;
}