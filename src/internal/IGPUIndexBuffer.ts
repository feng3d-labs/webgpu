import { IBuffer } from "@feng3d/render-api";

/**
 * GPU渲染时使用的索引缓冲区。
 *
 * {@link GPURenderCommandsMixin.setIndexBuffer}
 */
export interface IGPUSetIndexBuffer
{
    /**
     * Buffer containing index data to use for subsequent drawing commands.
     *
     * 顶点索引缓冲区，包含提供给后续绘制命令使用的顶点索引数据。
     */
    buffer: IBuffer;

    /**
     * Format of the index data contained in `buffer`.
     *
     * 缓冲区中提供的顶点索引数据格式。
     */
    indexFormat: GPUIndexFormat;

    /**
     * Offset in bytes into `buffer` where the index data begins. Defaults to `0`.
     *
     * 索引数据在缓冲区中的起始偏移值。默认为 `0` 。
     */
    offset?: number;

    /**
     * Size in bytes of the index data in `buffer`. Defaults to the size of the buffer minus the offset.
     *
     * 索引数据在缓冲区中所占字节尺寸。默认为缓冲区尺寸减去起始偏移值。
     */
    size?: number;
}
