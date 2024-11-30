import { IGPUTextureView } from "./IGPUTextureView";

/**
 * GPU渲染通道深度模板附件。
 *
 * @see GPURenderPassDepthStencilAttachment
 */
export interface IGPURenderPassDepthStencilAttachment
{
    /**
     * A {@link GPUTextureView} describing the texture subresource that will be output to
     * and read from for this depth/stencil attachment.
     *
     * 当值为空时，将自动从颜色附件中获取尺寸来创建深度纹理。
     */
    readonly view?: IGPUTextureView;

    /**
     * Indicates the value to clear {@link GPURenderPassDepthStencilAttachment#view}'s depth component
     * to prior to executing the render pass. Ignored if {@link GPURenderPassDepthStencilAttachment#depthLoadOp}
     * is not {@link GPULoadOp#"clear"}. Must be between 0.0 and 1.0, inclusive.
     * <!-- POSTV1(unrestricted-depth): unless unrestricted depth is enabled -->
     */
    readonly depthClearValue?: number;

    /**
     * Indicates the load operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
     * depth component prior to executing the render pass.
     * Note: It is recommended to prefer clearing; see {@link GPULoadOp#"clear"} for details.
     */
    readonly depthLoadOp?: GPULoadOp;

    /**
     * The store operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
     * depth component after executing the render pass.
     */
    readonly depthStoreOp?: GPUStoreOp;

    /**
     * Indicates that the depth component of {@link GPURenderPassDepthStencilAttachment#view}
     * is read only.
     */
    readonly depthReadOnly?: boolean;

    /**
     * Indicates the value to clear {@link GPURenderPassDepthStencilAttachment#view}'s stencil component
     * to prior to executing the render pass. Ignored if {@link GPURenderPassDepthStencilAttachment#stencilLoadOp}
     * is not {@link GPULoadOp#"clear"}.
     * The value will be converted to the type of the stencil aspect of `view` by taking the same
     * number of LSBs as the number of bits in the stencil aspect of one texel block|texel of `view`.
     */
    readonly stencilClearValue?: GPUStencilValue;

    /**
     * Indicates the load operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
     * stencil component prior to executing the render pass.
     * Note: It is recommended to prefer clearing; see {@link GPULoadOp#"clear"} for details.
     */
    readonly stencilLoadOp?: GPULoadOp;

    /**
     * The store operation to perform on {@link GPURenderPassDepthStencilAttachment#view}'s
     * stencil component after executing the render pass.
     */
    readonly stencilStoreOp?: GPUStoreOp;

    /**
     * Indicates that the stencil component of {@link GPURenderPassDepthStencilAttachment#view}
     * is read only.
     */
    readonly stencilReadOnly?: boolean;
}
