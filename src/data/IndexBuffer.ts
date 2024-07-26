import { IGPUSetIndexBuffer } from "../webgpu-data-driven/data/IGPURenderObject";
import { IBuffer } from "./IBuffer";

/**
 * 顶点索引缓冲区。
 */
export interface IIndexBuffer extends Omit<IGPUSetIndexBuffer, "buffer">
{
    /**
     * Buffer containing index data to use for subsequent drawing commands.
     *
     * 顶点索引缓冲区，包含提供给后续绘制命令使用的顶点索引数据。
     */
    buffer: IBuffer;
}
