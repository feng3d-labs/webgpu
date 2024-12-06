/**
 * Sets the viewport used during the rasterization stage to linearly map from NDC|normalized device coordinates to viewport coordinates.
 *
 * GPU绘制时视口尺寸。
 *
 * {@link GPURenderPassEncoder.setViewport}
 */
export interface IGPUViewport
{
    /**
     * 数据类型。
     */
    readonly __type: "Viewport";

    /**
     * 数据是否来着WebGL。
     *
     * WebGL以左下角为起始点，WebGPU以左上角为起点。
     */
    readonly fromWebGL?: boolean;

    /**
     * Minimum X value of the viewport in pixels.
     */
    readonly x: number,

    /**
     * Minimum Y value of the viewport in pixels.
     */
    readonly y: number,

    /**
     * Width of the viewport in pixels.
     */
    readonly width: number,

    /**
     * Height of the viewport in pixels.
     */
    readonly height: number,

    /**
     * Minimum depth value of the viewport.
     */
    readonly minDepth: number,

    /**
     * Maximum depth value of the viewport.
     */
    readonly maxDepth: number
}
