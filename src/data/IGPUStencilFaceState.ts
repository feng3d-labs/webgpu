
/**
 * {@link GPUStencilFaceState}
 */
export interface IGPUStencilFaceState
{
    /**
     * The {@link GPUCompareFunction} used when testing the {@link RenderState#[[stencilReference]]} value
     * against the fragment's {@link GPURenderPassDescriptor#depthStencilAttachment} stencil values.
     */
    readonly compare?: GPUCompareFunction;
    /**
     * The {@link GPUStencilOperation} performed if the fragment stencil comparison test described by
     * {@link GPUStencilFaceState#compare} fails.
     */
    readonly failOp?: GPUStencilOperation;
    /**
     * The {@link GPUStencilOperation} performed if the fragment depth comparison described by
     * {@link GPUDepthStencilState#depthCompare} fails.
     */
    readonly depthFailOp?: GPUStencilOperation;
    /**
     * The {@link GPUStencilOperation} performed if the fragment stencil comparison test described by
     * {@link GPUStencilFaceState#compare} passes.
     */
    readonly passOp?: GPUStencilOperation;
}