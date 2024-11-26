
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
    readonly __type: "IGPUViewport";

    /**
     * 数据是否来着WebGL。
     *
     * WebGL以左下角为起始点，WebGPU以左上角为起点。
     */
    fromWebGL?: boolean;

    /**
     * Minimum X value of the viewport in pixels.
     */
    x: number,

    /**
     * Minimum Y value of the viewport in pixels.
     */
    y: number,

    /**
     * Width of the viewport in pixels.
     */
    width: number,

    /**
     * Height of the viewport in pixels.
     */
    height: number,

    /**
     * Minimum depth value of the viewport.
     */
    minDepth: number,

    /**
     * Maximum depth value of the viewport.
     */
    maxDepth: number
}
