/**
 * Sets the scissor rectangle used during the rasterization stage. After transformation into viewport coordinates any fragments which fall outside the scissor rectangle will be discarded.
 *
 * GPU绘制时视口尺寸。
 *
 * {@link GPURenderPassEncoder.setScissorRect}
 */
export interface IGPUScissorRect
{
    /**
     * 数据类型。
     */
    readonly __type: "ScissorRect";

    /**
     * 数据是否来着WebGL。
     *
     * WebGL以左下角为起始点，WebGPU以左上角为起点。
     */
    readonly fromWebGL?: boolean;

    /**
     * Minimum X value of the scissor rectangle in pixels.
     */
    readonly x: GPUIntegerCoordinate,

    /**
     * Minimum Y value of the scissor rectangle in pixels.
     */
    readonly y: GPUIntegerCoordinate,

    /**
     * Width of the scissor rectangle in pixels.
     */
    readonly width: GPUIntegerCoordinate,

    /**
     * Height of the scissor rectangle in pixels.
     */
    readonly height: GPUIntegerCoordinate
}
