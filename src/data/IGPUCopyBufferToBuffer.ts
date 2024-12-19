import { IBuffer } from "@feng3d/render-api";

/**
 * GPU缓冲区之间拷贝。
 *
 * {@link GPUCommandEncoder.copyBufferToBuffer}
 */
export interface IGPUCopyBufferToBuffer
{
    /**
     * 数据类型。
     */
    readonly __type: "CopyBufferToBuffer";

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
