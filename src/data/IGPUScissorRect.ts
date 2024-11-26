
/**
 * Sets the scissor rectangle used during the rasterization stage. After transformation into viewport coordinates any fragments which fall outside the scissor rectangle will be discarded.
 *
 * GPU绘制时视口尺寸。
 *
 * {@link GPURenderPassEncoder.setScissorRect}
 */
export interface IGPUScissorRect
{
    readonly type: "IGPUScissorRect";

    /**
     * 数据是否来着WebGL。
     *
     * WebGL以左下角为起始点，WebGPU以左上角为起点。
     */
    fromWebGL?: boolean;

    /**
     * Minimum X value of the scissor rectangle in pixels.
     */
    x: GPUIntegerCoordinate,

    /**
     * Minimum Y value of the scissor rectangle in pixels.
     */
    y: GPUIntegerCoordinate,

    /**
     * Width of the scissor rectangle in pixels.
     */
    width: GPUIntegerCoordinate,

    /**
     * Height of the scissor rectangle in pixels.
     */
    height: GPUIntegerCoordinate
}
