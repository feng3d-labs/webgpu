import { ComputePass } from "../data/ComputePass";
import { getGPURenderTimestampQuery } from "./getGPURenderTimestampQuery";

export function getGPUComputePassDescriptor(commandEncoder: GPUCommandEncoder, computePass: ComputePass)
{
    const descriptor: GPUComputePassDescriptor = {};

    const device = commandEncoder.device;

    if (computePass.descriptor?.timestampQuery)
    {
        descriptor.timestampWrites = getGPURenderTimestampQuery(device, computePass.descriptor.timestampQuery);
    }

    return descriptor;
}