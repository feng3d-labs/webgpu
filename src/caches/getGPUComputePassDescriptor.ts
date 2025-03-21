import { ComputePass } from "../data/ComputePass";
import { getGPURenderTimestampQuery } from "./getGPURenderTimestampQuery";

export function getGPUComputePassDescriptor(commandEncoder: GPUCommandEncoder, computePass: ComputePass)
{
    const descriptor: GPUComputePassDescriptor = {};
    descriptor.commandEncoder = commandEncoder;

    const device = commandEncoder.device;

    if (computePass.timestampQuery)
        getGPURenderTimestampQuery(device, descriptor, computePass?.timestampQuery);

    return descriptor;
}