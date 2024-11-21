import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getIGPUIndexBuffer } from "./getIGPUIndexBuffer";

export function runIndexBuffer(device: GPUDevice, passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, index: Uint16Array | Uint32Array)
{
    if (!index) return;

    const indexBuffer = getIGPUIndexBuffer(index);

    const { buffer, indexFormat, offset, size } = indexBuffer;
    const gBuffer = getGPUBuffer(device, buffer);

    passEncoder.setIndexBuffer(gBuffer, indexFormat, offset, size);
}