
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
    data: IGPUVertexAttributeDataType;

    /**
     * 顶点数据元素数量。
     */
    readonly numComponents: 1 | 2 | 3 | 4;

    /**
     * 所在顶点数据中的偏移字节数。
     */
    readonly offset?: number;

    /**
     * {@link GPUVertexBufferLayout.arrayStride}
     */
    readonly vertexSize?: number;

    /**
     * Whether each element of this array represents per-vertex data or per-instance data
     *
     * {@link GPUVertexBufferLayout.stepMode}
     *
     * 默认 `"vertex"` 。
     */
    readonly stepMode?: GPUVertexStepMode;
}

export type IGPUVertexAttributeDataType = | Float32Array
| Uint32Array
| Int32Array
| Uint16Array
| Int16Array
| Uint8ClampedArray
| Uint8Array
| Int8Array