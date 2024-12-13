
/**
 * {@link GPUStencilFaceState}
 */
export interface IGPUStencilFaceState
{
    /**
     * The {@link GPUCompareFunction} used when testing the {@link RenderState#[[stencilReference]]} value
     * against the fragment's {@link GPURenderPassDescriptor#depthStencilAttachment} stencil values.
     * 
     * 默认为 "always"。
     */
    readonly compare?: GPUCompareFunction;

    /**
     * The {@link GPUStencilOperation} performed if the fragment stencil comparison test described by
     * {@link GPUStencilFaceState#compare} fails.
     * 
     * 默认为 "keep"。
     */
    readonly failOp?: GPUStencilOperation;

    /**
     * The {@link GPUStencilOperation} performed if the fragment depth comparison described by
     * {@link GPUDepthStencilState#depthCompare} fails.
     * 
     * 默认为 "keep"。
     */
    readonly depthFailOp?: GPUStencilOperation;

    /**
     * The {@link GPUStencilOperation} performed if the fragment stencil comparison test described by
     * {@link GPUStencilFaceState#compare} passes.
     * 
     * 默认为 "keep"。
     */
    readonly passOp?: GPUStencilOperation;
}