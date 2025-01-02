import { ISampler } from "@feng3d/render-api";

/**
 * GPU采样器描述。
 *
 * {@link GPUSampler}
 *
 * {@link GPUSamplerDescriptor}
 */
export interface IGPUSampler extends ISampler
{
    /**
     * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
     */
    readonly label?: string;

    /**
     * Specifies the sampling behavior when the sampled area is smaller than or equal to one
     * texel.
     */
    magFilter?: GPUFilterMode;

    /**
     * Specifies the sampling behavior when the sampled area is larger than one texel.
     */
    minFilter?: GPUFilterMode;

    /**
     * Specifies behavior for sampling between mipmap levels.
     */
    mipmapFilter?: GPUMipmapFilterMode;

    /**
     */
    lodMinClamp?: number;

    /**
     * Specifies the minimum and maximum levels of detail, respectively, used internally when
     * sampling a texture.
     */
    lodMaxClamp?: number;

    /**
     * When provided the sampler will be a comparison sampler with the specified
     * {@link GPUCompareFunction}.
     * Note: Comparison samplers may use filtering, but the sampling results will be
     * implementation-dependent and may differ from the normal filtering rules.
     */
    compare?: GPUCompareFunction;

    /**
     * Specifies the maximum anisotropy value clamp used by the sampler. Anisotropic filtering is
     * enabled when {@link GPUSamplerDescriptor#maxAnisotropy} is &gt; 1 and the implementation supports it.
     * Anisotropic filtering improves the image quality of textures sampled at oblique viewing
     * angles. Higher {@link GPUSamplerDescriptor#maxAnisotropy} values indicate the maximum ratio of
     * anisotropy supported when filtering.
     * <div class=note heading>
     * Most implementations support {@link GPUSamplerDescriptor#maxAnisotropy} values in range
     * between 1 and 16, inclusive. The used value of {@link GPUSamplerDescriptor#maxAnisotropy}
     * will be clamped to the maximum value that the platform supports.
     * The precise filtering behavior is implementation-dependent.
     * </div>
     */
    maxAnisotropy?: number;
}
