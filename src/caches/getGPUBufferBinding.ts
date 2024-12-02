import { IGPUBufferBinding } from "../data/IGPUBufferBinding";
import { getGPUBuffer } from "./getGPUBuffer";
import { getIGPUBuffer } from "./getIGPUBuffer";

export function getGPUBufferBinding(device: GPUDevice, resource: IGPUBufferBinding): GPUBufferBinding
{
    const b = getIGPUBuffer(resource.bufferView);
    const buffer = getGPUBuffer(device, b);

    const offset = resource.bufferView.byteOffset;
    const size = resource.bufferView.byteLength;

    return {
        buffer,
        offset,
        size,
    };
}
