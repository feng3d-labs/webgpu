
/**
 * 根据索引数据绘制图元。
 *
 * {@link GPURenderCommandsMixin.drawIndexed}
 */
export interface IGPUDrawIndexed
{
    /**
     * The number of indices to draw.
     */
    readonly indexCount: number;

    /**
     * The number of instances to draw.
     */
    readonly instanceCount?: number;

    /**
     * Offset into the index buffer, in indices, begin drawing from.
     */
    readonly firstIndex?: number;

    /**
     * Added to each index value before indexing into the vertex buffers.
     */
    readonly baseVertex?: number;

    /**
     * First instance to draw.
     */
    readonly firstInstance?: number;
}
