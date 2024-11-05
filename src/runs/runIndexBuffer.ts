import { getGPUBuffer } from "../caches/getGPUBuffer";
import { IGPUIndexBuffer } from "../data/IGPURenderObject";

export function runIndexBuffer(device: GPUDevice, passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, index?: IGPUIndexBuffer)
{
    if (!index) return;

    const { buffer, indexFormat, offset, size } = index;
    const gBuffer = getGPUBuffer(device, buffer);

    passEncoder.setIndexBuffer(gBuffer, indexFormat, offset, size);
}