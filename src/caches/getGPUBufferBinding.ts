import { BufferBinding } from "@feng3d/render-api";
import { getGPUBuffer } from "./getGPUBuffer";
import { getIGPUBuffer } from "./getIGPUBuffer";

export function getGPUBufferBinding(device: GPUDevice, resource: BufferBinding): GPUBufferBinding
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
