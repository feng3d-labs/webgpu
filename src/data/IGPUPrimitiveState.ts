
/**
 * {@link GPUPrimitiveState}
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
     * For pipelines with strip topologies
     * ({@link GPUPrimitiveTopology#"line-strip"} or {@link GPUPrimitiveTopology#"triangle-strip"}),
     * this determines the index buffer format and primitive restart value
     * ({@link GPUIndexFormat#"uint16"}/`0xFFFF` or {@link GPUIndexFormat#"uint32"}/`0xFFFFFFFF`).
     * It is not allowed on pipelines with non-strip topologies.
     * Note: Some implementations require knowledge of the primitive restart value to compile
     * pipeline state objects.
     * To use a strip-topology pipeline with an indexed draw call
     * ({@link GPURenderCommandsMixin#drawIndexed()} or {@link GPURenderCommandsMixin#drawIndexedIndirect}),
     * this must be set, and it must match the index buffer format used with the draw call
     * (set in {@link GPURenderCommandsMixin#setIndexBuffer}).
     * See [[#primitive-assembly]] for additional details.
     */
    readonly stripIndexFormat?: GPUIndexFormat;
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