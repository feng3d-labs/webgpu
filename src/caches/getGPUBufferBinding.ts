import { IGPUBufferBinding } from "../data/IGPUBindGroupDescriptor";
import { getIGPUBuffer } from "../runs/getIGPUIndexBuffer";
import { getGPUBuffer } from "./getGPUBuffer";

export function getGPUBufferBinding(device: GPUDevice, resource: IGPUBufferBinding): GPUBufferBinding
{
    const b = getIGPUBuffer(resource.bufferView);
    const buffer = getGPUBuffer(device, b);

    const offset = resource.bufferView.byteOffset;

    return {
        buffer,
        offset,
    };
}
