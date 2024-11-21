import { IGPUBuffer } from "./IGPUBuffer";

/**
 * 顶点属性数据映射。
 */
export interface IGPUVertexAttributes
{
    [name: string]: IGPUVertexAttribute;
}

/**
 * 顶点属性数据。
 */
export interface IGPUVertexAttribute
{
    /**
     * 顶点数据。
     */
    data: ArrayBufferView;

    /**
     * 顶点数据元素数量。
     */
    numComponents?: 1 | 2 | 3 | 4;

    /**
     * 所在顶点数据中的偏移字节数。
     */
    offset?: number;

    /**
     * {@link GPUVertexBufferLayout.arrayStride}
     */
    vertexSize?: number;

    /**
     * Whether each element of this array represents per-vertex data or per-instance data
     *
     * {@link GPUVertexBufferLayout.stepMode}
     *
     * 默认 `"vertex"` 。
     */
    stepMode?: GPUVertexStepMode;
}
