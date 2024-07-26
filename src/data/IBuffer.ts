import { IGPUBuffer } from "../webgpu-data-driven/data/IGPUBuffer";

/**
 * {@link IBuffer.size} 可以不赋值，将由 {@link IBuffer.data} 计算得出。
 */
export interface IBuffer extends Omit<IGPUBuffer, "size" | "usage">
{
    /**
     * The size of the buffer in bytes.
     */
    size?: GPUSize64;

    /**
     * The allowed usages for the buffer.
     */
    usage?: GPUBufferUsageFlags;
}
