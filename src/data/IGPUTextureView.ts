import { IGPUTexture } from "./IGPUTexture";

/**
 * 视图纹理。
 *
 * @see GPUTextureView
 * @see GPUTexture.createView
 * @see GPUTextureViewDescriptor
 */
export interface IGPUTextureView
{
    /**
     * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
     */
    readonly label?: string;

    /**
     * 产生视图的纹理。
     */
    readonly texture: IGPUTexture;

    /**
     * The format of the texture view. Must be either the {@link GPUTextureDescriptor#format} of the
     * texture or one of the {@link GPUTextureDescriptor#viewFormats} specified during its creation.
     */
    readonly format?: GPUTextureFormat;
    /**
     * The dimension to view the texture as.
     */
    readonly dimension?: GPUTextureViewDimension;
    /**
     * The allowed {@link GPUTextureUsage|usage(s)} for the texture view. Must be a subset of the
     * {@link GPUTexture#usage} flags of the texture. If 0, defaults to the full set of
     * {@link GPUTexture#usage} flags of the texture.
     * Note: If the view's {@link GPUTextureViewDescriptor#format} doesn't support all of the
     * texture's {@link GPUTextureDescriptor#usage}s, the default will fail,
     * and the view's {@link GPUTextureViewDescriptor#usage} must be specified explicitly.
     */
    readonly usage?: GPUTextureUsageFlags;
    /**
     * Which {@link GPUTextureAspect|aspect(s)} of the texture are accessible to the texture view.
     */
    readonly aspect?: GPUTextureAspect;
    /**
     * The first (most detailed) mipmap level accessible to the texture view.
     */
    readonly baseMipLevel?: GPUIntegerCoordinate;
    /**
     * How many mipmap levels, starting with {@link GPUTextureViewDescriptor#baseMipLevel}, are accessible to
     * the texture view.
     */
    readonly mipLevelCount?: GPUIntegerCoordinate;
    /**
     * The index of the first array layer accessible to the texture view.
     */
    readonly baseArrayLayer?: GPUIntegerCoordinate;
    /**
     * How many array layers, starting with {@link GPUTextureViewDescriptor#baseArrayLayer}, are accessible
     * to the texture view.
     */
    readonly arrayLayerCount?: GPUIntegerCoordinate;
}
