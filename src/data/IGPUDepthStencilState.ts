import { IGPUStencilFaceState } from "./IGPUStencilFaceState";

/**
 * 深度模板阶段描述。
 *
 * `format` 将从深度附件 {@link IGPURenderPassDescriptor.depthStencilAttachment} 纹理上获取。
 *
 * {@link GPUDepthStencilState}
 */
export interface IGPUDepthStencilState
{
    /**
     * Indicates if this {@link GPURenderPipeline} can modify
     * {@link GPURenderPassDescriptor#depthStencilAttachment} depth values.
     *
     * 默认为 `true` 。
     */
    readonly depthWriteEnabled?: boolean;

    /**
     * The comparison operation used to test fragment depths against
     * {@link GPURenderPassDescriptor#depthStencilAttachment} depth values.
     *
     * 默认 `'less'` 。
     */
    readonly depthCompare?: GPUCompareFunction;

    /**
     * Defines how stencil comparisons and operations are performed for front-facing primitives.
     */
    readonly stencilFront?: IGPUStencilFaceState;
    /**
     * Defines how stencil comparisons and operations are performed for back-facing primitives.
     */
    readonly stencilBack?: IGPUStencilFaceState;
    /**
     * Bitmask controlling which {@link GPURenderPassDescriptor#depthStencilAttachment} stencil value
     * bits are read when performing stencil comparison tests.
     */
    readonly stencilReadMask?: GPUStencilValue;
    /**
     * Bitmask controlling which {@link GPURenderPassDescriptor#depthStencilAttachment} stencil value
     * bits are written to when performing stencil operations.
     */
    readonly stencilWriteMask?: GPUStencilValue;
    /**
     * Constant depth bias added to each triangle fragment. See [$biased fragment depth$] for details.
     */
    readonly depthBias?: GPUDepthBias;
    /**
     * Depth bias that scales with the triangle fragment’s slope. See [$biased fragment depth$] for details.
     */
    readonly depthBiasSlopeScale?: number;
    /**
     * The maximum depth bias of a triangle fragment. See [$biased fragment depth$] for details.
     */
    readonly depthBiasClamp?: number;
}
