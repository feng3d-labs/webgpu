/**
 * GPU画布配置。
 *
 * @see GPUCanvasConfiguration
 * @see GPUCanvasContext.configure
 */
export interface IGPUCanvasConfiguration
{
    /**
     * The usage that textures returned by {@link GPUCanvasContext#getCurrentTexture} will have.
     * {@link GPUTextureUsage#RENDER_ATTACHMENT} is the default, but is not automatically included
     * if the usage is explicitly set. Be sure to include {@link GPUTextureUsage#RENDER_ATTACHMENT}
     * when setting a custom usage if you wish to use textures returned by
     * {@link GPUCanvasContext#getCurrentTexture} as color targets for a render pass.
     */
    usage?: GPUTextureUsageFlags;

    /**
     * The format that textures returned by {@link GPUCanvasContext#getCurrentTexture} will have.
     * Must be one of the Supported context formats.
     *
     * 默认 `navigator.gpu.getPreferredCanvasFormat()` 。
     */
    format?: GPUTextureFormat;

    /**
     * Determines the effect that alpha values will have on the content of textures returned by
     * {@link GPUCanvasContext#getCurrentTexture} when read, displayed, or used as an image source.
     *
     * 默认 'premultiplied' 。
     */
    alphaMode?: GPUCanvasAlphaMode;

    /**
     * The formats that views created from textures returned by
     * {@link GPUCanvasContext#getCurrentTexture} may use.
     */
    viewFormats?: Iterable<GPUTextureFormat>;
    /**
     * The color space that values written into textures returned by
     * {@link GPUCanvasContext#getCurrentTexture} should be displayed with.
     */
    colorSpace?: PredefinedColorSpace;
    /**
     * The tone mapping determines how the content of textures returned by
     * {@link GPUCanvasContext#getCurrentTexture} are to be displayed.
     */
    toneMapping?: GPUCanvasToneMapping;
}
