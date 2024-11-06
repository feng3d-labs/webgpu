import { getGPUBuffer } from "../caches/getGPUBuffer";
import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";

export function runCopyBufferToBuffer(device: GPUDevice, commandEncoder: GPUCommandEncoder, v: IGPUCopyBufferToBuffer)
{
    v.sourceOffset ||= 0;
    v.destinationOffset ||= 0;
    v.size ||= v.source.size;

    //
    const sourceBuffer = getGPUBuffer(device, v.source);
    const destinationBuffer = getGPUBuffer(device, v.destination);

    commandEncoder.copyBufferToBuffer(
        sourceBuffer,
        v.sourceOffset,
        destinationBuffer,
        v.destinationOffset,
        v.size,
    );
}