import { IGPURenderBundleObject } from "./IGPURenderBundleObject";
import { IGPURenderObject } from "./IGPURenderObject";
import { IGPUTextureView } from "./IGPUTextureView";

/**
 * GPU渲染通道编码器。
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/GPURenderPassEncoder
 *
 * {@link GPURenderPassEncoder}
 */
export interface IGPURenderPassEncoder
{
    /**
     * 渲染通道描述。
     */
    renderPass: IGPURenderPassDescriptor;

    /**
     * 渲染对象列表
     */
    renderObjects: (IGPURenderObject | IGPURenderBundleObject)[];
}

/**
 * 渲染通道描述。
 *
 * {@link GPURenderPassDescriptor}
 */
export interface IGPURenderPassDescriptor extends Omit<GPURenderPassDescriptor, "colorAttachments" | "depthStencilAttachment">
{
    /**
     * The set of {@link GPURenderPassColorAttachment} values in this sequence defines which
     * color attachments will be output to when executing this render pass.
     * Due to compatible usage list|usage compatibility, no color attachment
     * may alias another attachment or any resource used inside the render pass.
     */
    colorAttachments: IGPURenderPassColorAttachment[];

    /**
     * The {@link GPURenderPassDepthStencilAttachment} value that defines the depth/stencil
     * attachment that will be output to and tested against when executing this render pass.
     * Due to compatible usage list|usage compatibility, no writable depth/stencil attachment
     * may alias another attachment or any resource used inside the render pass.
     */
    depthStencilAttachment?: IGPURenderPassDepthStencilAttachment;
}

/**
 * GPU渲染通道颜色附件。
 *
 * {@link GPURenderPassColorAttachment}
 */
export interface IGPURenderPassColorAttachment extends Omit<GPURenderPassColorAttachment, "view" | "resolveTarget" | "loadOp" | "storeOp">
{
    /**
     * A {@link GPUTextureView} describing the texture subresource that will be output to for this
     * color attachment.
     */
    view: IGPUTextureView;

    /**
     * A {@link GPUTextureView} describing the texture subresource that will receive the resolved
     * output for this color attachment if {@link GPURenderPassColorAttachment#view} is
     * multisampled.
     */
    resolveTarget?: IGPUTextureView;

    /**
     * Indicates the value to clear {@link GPURenderPassColorAttachment#view} to prior to executing the
     * render pass. If not map/exist|provided, defaults to `{r: 0, g: 0, b: 0, a: 0}`. Ignored
     * if {@link GPURenderPassColorAttachment#loadOp} is not {@link GPULoadOp#"clear"}.
     * The components of {@link GPURenderPassColorAttachment#clearValue} are all double values.
     * They are converted [$to a texel value of texture format$] matching the render attachment.
     * If conversion fails, a validation error is generated.
     *
     * 默认 `[0, 0, 0, 0]` 。
     */
    clearValue?: GPUColor;

    /**
     * Indicates the load operation to perform on {@link GPURenderPassColorAttachment#view} prior to
     * executing the render pass.
     * Note: It is recommended to prefer clearing; see {@link GPULoadOp#"clear"} for details.
     *
     * 默认 `"clear"` 。
    */
    loadOp?: GPULoadOp;

    /**
     * The store operation to perform on {@link GPURenderPassColorAttachment#view}
     * after executing the render pass.
     *
      * 默认 `"store"` 。
      */
    storeOp?: GPUStoreOp;
}

/**
 * GPU渲染通道深度模板附件。
 *
 * @see GPURenderPassDepthStencilAttachment
 */
export interface IGPURenderPassDepthStencilAttachment extends Omit<GPURenderPassDepthStencilAttachment, "view">
{
    /**
     * A {@link GPUTextureView} describing the texture subresource that will be output to
     * and read from for this depth/stencil attachment.
     */
    view: IGPUTextureView;

    /**
     * 接收多重采样结果的纹理视图。
     */
    resolveTarget?: IGPUTextureView;
}
