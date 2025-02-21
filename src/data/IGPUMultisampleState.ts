import { RenderPassDescriptor } from "@feng3d/render-api";

/**
 * 多重采样阶段描述。
 *
 * 多重采样次数将由 {@link RenderPassDescriptor.sampleCount} 覆盖。
 */
export interface IGPUMultisampleState
{
    /**
     * Mask determining which samples are written to.
     */
    readonly mask?: GPUSampleMask;

    /**
     * When `true` indicates that a fragment's alpha channel should be used to generate a sample
     * coverage mask.
     */
    readonly alphaToCoverageEnabled?: boolean;
}