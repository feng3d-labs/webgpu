import { IRenderPassColorAttachment, ITextureView } from "@feng3d/render-api";

/**
 * 内部使用
 */
export interface NGPURenderPassColorAttachment extends IRenderPassColorAttachment
{
    /**
     * A {@link GPUTextureView} describing the texture subresource that will receive the resolved
     * output for this color attachment if {@link GPURenderPassColorAttachment#view} is
     * multisampled.
     */
    resolveTarget?: ITextureView;
}
