import { IGPUTextureView } from "./IGPUTextureView";

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
     *
     * 当值为空时，将自动从颜色附件中获取尺寸来创建深度纹理。
     */
    view?: IGPUTextureView;

    /**
     * 作为解决多重采样的纹理视图。
     */
    resolveTarget?: IGPUTextureView;
}
