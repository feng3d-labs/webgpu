import { IGPUTextureView } from "./IGPUTextureView";

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
  readonly view: IGPUTextureView;

  /**
   * A {@link GPUTextureView} describing the texture subresource that will receive the resolved
   * output for this color attachment if {@link GPURenderPassColorAttachment#view} is
   * multisampled.
   */
  readonly resolveTarget?: IGPUTextureView;

  /**
   * Indicates the depth slice index of {@link GPUTextureViewDimension#"3d"} {@link GPURenderPassColorAttachment#view}
   * that will be output to for this color attachment.
   */
  readonly depthSlice?: GPUIntegerCoordinate;

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
  readonly clearValue?: GPUColor;

  /**
   * Indicates the load operation to perform on {@link GPURenderPassColorAttachment#view} prior to
   * executing the render pass.
   * Note: It is recommended to prefer clearing; see {@link GPULoadOp#"clear"} for details.
   *
   * 默认 `"clear"` 。
  */
  readonly loadOp?: GPULoadOp;

  /**
   * The store operation to perform on {@link GPURenderPassColorAttachment#view}
   * after executing the render pass.
   *
    * 默认 `"store"` 。
    */
  readonly storeOp?: GPUStoreOp;
}
