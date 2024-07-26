import { IGPUBuffer } from "./IGPUBuffer";

/**
 * GPU缓冲区之间拷贝。
 *
 * {@link GPUCommandEncoder.copyBufferToBuffer}
 */
export interface IGPUCopyBufferToBuffer
{
    source: IGPUBuffer,
    sourceOffset: GPUSize64,
    destination: IGPUBuffer,
    destinationOffset: GPUSize64,
    size: GPUSize64
}
