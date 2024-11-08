import { IGPUBufferBinding } from "../data/IGPUBindGroupDescriptor";
import { getGPUBuffer } from "./getGPUBuffer";

export function getGPUBufferBinding(device: GPUDevice, resource: IGPUBufferBinding): GPUBufferBinding
{
    const buffer = getGPUBuffer(device, resource.buffer);

    return {
        ...resource,
        buffer,
    };
}
