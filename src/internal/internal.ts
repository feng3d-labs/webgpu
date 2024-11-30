import { IGPURenderPassColorAttachment } from "../data/IGPURenderPassColorAttachment";
import { IGPUTextureView } from "../data/IGPUTextureView";

/**
 * 内部使用
 */
export interface NGPURenderPassColorAttachment extends IGPURenderPassColorAttachment
{
    /**
     * A {@link GPUTextureView} describing the texture subresource that will receive the resolved
     * output for this color attachment if {@link GPURenderPassColorAttachment#view} is
     * multisampled.
     */
    resolveTarget?: IGPUTextureView;
}