import { IBuffer } from "./IBuffer";

/**
 * 顶点属性数据映射。
 */
export interface IVertexAttributes
{
    [name: string]: IVertexAttribute;
}

/**
 * 顶点属性数据。
 */
export interface IVertexAttribute
{
    /**
     * 顶点数据。
     */
    buffer: IBuffer;

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

    /**
     * GPU顶点数据格式。默认由 着色器反射获得。
     */
    format?: GPUVertexFormat;
}
