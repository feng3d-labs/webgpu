import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getIGPUIndexBuffer } from "./getIGPUIndexBuffer";

export function runIndices(device: GPUDevice, passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, indices: Uint16Array | Uint32Array)
{
    if (!indices) return;

    const indexBuffer = getIGPUIndexBuffer(indices);

    const { buffer, indexFormat, offset, size } = indexBuffer;
    const gBuffer = getGPUBuffer(device, buffer);

    passEncoder.setIndexBuffer(gBuffer, indexFormat, offset, size);
}