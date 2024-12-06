import { IGPUVertexDataTypes } from "../data/IGPUVertexAttributes";

/**
 * Sets the current vertex buffer for the given slot.
 *
 * GPU渲染时使用的顶点缓冲区列表。
 *
 * {@link GPURenderCommandsMixin.setVertexBuffer}
 */
export interface NGPUVertexBuffer
{
    /**
     * Buffer containing vertex data to use for subsequent drawing commands.
     *
     * GPU缓冲区，包含后续绘制命令所包含的顶点数据的
     */
    data: IGPUVertexDataTypes;

    /**
     * Offset in bytes into `buffer` where the vertex data begins. Defaults to `0`.
     *
     * 使用的顶点数据在缓冲区中的起始偏移值，默认值为 `0` 。
     */
    offset?: number;

    /**
     * Size in bytes of the vertex data in `buffer`. Defaults to the size of the buffer minus the offset.
     *
     * 使用的顶点数据在缓冲区中所占字节尺寸。默认为缓冲区尺寸减去起始偏移值。
     */
    size?: number;
}
