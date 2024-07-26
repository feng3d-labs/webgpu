import { IBuffer } from "./IBuffer";
import { IGPUCopyBufferToBuffer } from "./IGPUCopyBufferToBuffer";

/**
 * 拷贝GPU缓冲区。
 */
export interface ICopyBufferToBuffer extends Omit<IGPUCopyBufferToBuffer, "source" | "destination" | "sourceOffset" | "destinationOffset" | "size">
{
    /**
     * 源缓冲区。
     */
    source: IBuffer,
    /**
     * 默认为0。
     */
    sourceOffset?: GPUSize64,
    /**
     * 目标缓冲区。
     */
    destination: IBuffer,
    /**
     * 默认为0。
     */
    destinationOffset?: GPUSize64,
    /**
     * 默认为源缓冲区尺寸。
     */
    size?: GPUSize64
}
