/**
 * Sets the {@link RenderState#[[stencilReference]]} value used during stencil tests with
 * the {@link GPUStencilOperation#"replace"} {@link GPUStencilOperation}.
 * 
 * {@link GPURenderPassEncoder.setStencilReference}
 */
export interface IGPUStencilReference
{
    /**
     * 数据类型。
     */
    readonly __type: "IGPUStencilReference";

    /**
     * The new stencil reference value.
     */
    readonly reference: GPUStencilValue;
}