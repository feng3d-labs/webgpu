
/**
 * {@link GPUPrimitiveState}
 * 
 * `stripIndexFormat` 将由引擎自动设置。
 */
export interface IGPUPrimitiveState
{
    /**
     * The type of primitive to be constructed from the vertex inputs.
     *
     * WebGPU 默认 `"triangle-list"` ,默认每三个顶点绘制一个三角形。
     */
    readonly topology?: GPUPrimitiveTopology;

    /**
     * Defines which polygon orientation will be culled, if any.
     *
     * WebGPU 默认 `"none"` ,不进行剔除。
     */
    readonly cullMode?: GPUCullMode;

    /**
     * Defines which polygons are considered front-facing.
     */
    readonly frontFace?: GPUFrontFace;
    /**
     * If true, indicates that depth clipping is disabled.
     * Requires the {@link GPUFeatureName#"depth-clip-control"} feature to be enabled.
     */
    readonly unclippedDepth?: boolean;
}