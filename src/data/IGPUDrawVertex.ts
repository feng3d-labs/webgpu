
/**
 * Draws primitives.
 *
 * 根据顶点数据绘制图元。
 *
 * @see GPURenderCommandsMixin.draw
 */
export interface IGPUDrawVertex
{
    /**
     * The number of vertices to draw.
     */
    readonly vertexCount: number;

    /**
     * The number of instances to draw.
     */
    readonly instanceCount?: number;

    /**
     * Offset into the vertex buffers, in vertices, to begin drawing from.
     */
    readonly firstVertex?: number;

    /**
     * First instance to draw.
     */
    readonly firstInstance?: number;
}
