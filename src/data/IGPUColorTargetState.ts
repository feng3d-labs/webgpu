import { IGPUBlendState } from "./IGPUBlendState";

/**
 * 属性 `format` 将由渲染通道中附件给出。
 */
export interface IGPUColorTargetState
{
    /**
     * The blending behavior for this color target. If left undefined, disables blending for this
     * color target.
     */
    readonly blend?: IGPUBlendState;

    /**
     * Bitmask controlling which channels are are written to when drawing to this color target.
     */
    readonly writeMask?: GPUColorWriteFlags;
}