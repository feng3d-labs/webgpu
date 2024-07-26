/**
 * GPU画布配置。
 *
 * @see GPUCanvasConfiguration
 * @see GPUCanvasContext.configure
 */
export interface IGPUCanvasConfiguration extends Omit<GPUCanvasConfiguration, 'device' | 'usage'>
{
    /**
     * The usage that textures returned by {@link GPUCanvasContext#getCurrentTexture} will have.
     * {@link GPUTextureUsage#RENDER_ATTACHMENT} is the default, but is not automatically included
     * if the usage is explicitly set. Be sure to include {@link GPUTextureUsage#RENDER_ATTACHMENT}
     * when setting a custom usage if you wish to use textures returned by
     * {@link GPUCanvasContext#getCurrentTexture} as color targets for a render pass.
     */
    usage?: GPUTextureUsageFlags;
}
