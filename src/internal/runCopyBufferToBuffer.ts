import { CopyBufferToBuffer } from '@feng3d/render-api';
import { WGPUBuffer } from '../caches/WGPUBuffer';

export function runCopyBufferToBuffer(device: GPUDevice, commandEncoder: GPUCommandEncoder, copyBufferToBuffer: CopyBufferToBuffer)
{
    //
    const sourceBuffer = WGPUBuffer.getInstance(device, copyBufferToBuffer.source);
    const source = sourceBuffer.gpuBuffer;

    //
    const sourceOffset = copyBufferToBuffer.sourceOffset ?? 0;

    //
    const destinationBuffer = WGPUBuffer.getInstance(device, copyBufferToBuffer.destination);
    const destination = destinationBuffer.gpuBuffer;

    //
    const destinationOffset = copyBufferToBuffer.destinationOffset ?? 0;

    //
    const size = copyBufferToBuffer.size ?? source.size;

    commandEncoder.copyBufferToBuffer(source, sourceOffset, destination, destinationOffset, size);
}
