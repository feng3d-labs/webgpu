import { ITexture } from "@feng3d/render-api";

declare module "@feng3d/render-api"
{
    /**
     * 纹理的图片资源。
     *
     * @see GPUQueue.copyExternalImageToTexture
     */
    export interface ITextureImageSource
    {
        /**
         * Defines which aspects of the {@link GPUImageCopyTexture#texture} to copy to/from.
         *
         * 写入纹理哪部分内容。
         */
        aspect?: GPUTextureAspect;

        /**
         * Describes the color space and encoding used to encode data into the destination texture.
         * This [[#color-space-conversions|may result]] in values outside of the range [0, 1]
         * being written to the target texture, if its format can represent them.
         * Otherwise, the results are clamped to the target texture format's range.
         * Note:
         * If {@link GPUImageCopyTextureTagged#colorSpace} matches the source image,
         * conversion may not be necessary. See [[#color-space-conversion-elision]].
         */
        colorSpace?: PredefinedColorSpace;
    }

    /**
     * 纹理的数据资源。
     *
     * @see GPUQueue.writeTexture
     */
    export interface ITextureDataSource
    {
        /**
         * Defines which aspects of the {@link GPUImageCopyTexture#texture} to copy to/from.
         *
         * 写入纹理哪部分内容。
         */
        aspect?: GPUTextureAspect;
    }

    /**
     *
     * @see GPUDevice.createTexture
     * @see GPUTextureDescriptor
     */
    export interface ITexture
    {
        /**
         * Specifies what view {@link GPUTextureViewDescriptor#format} values will be allowed when calling
         * {@link GPUTexture#createView} on this texture (in addition to the texture's actual
         * {@link GPUTextureDescriptor#format}).
         * <div class=note heading>
         * Adding a format to this list may have a significant performance impact, so it is best
         * to avoid adding formats unnecessarily.
         * The actual performance impact is highly dependent on the target system; developers must
         * test various systems to find out the impact on their particular application.
         * For example, on some systems any texture with a {@link GPUTextureDescriptor#format} or
         * {@link GPUTextureDescriptor#viewFormats} entry including
         * {@link GPUTextureFormat#"rgba8unorm-srgb"} will perform less optimally than a
         * {@link GPUTextureFormat#"rgba8unorm"} texture which does not.
         * Similar caveats exist for other formats and pairs of formats on other systems.
         * </div>
         * Formats in this list must be texture view format compatible with the texture format.
         * <div algorithm data-timeline=const>
         * Two {@link GPUTextureFormat}s `format` and `viewFormat` are <dfn dfn for="">texture view format compatible</dfn> if:
         * - `format` equals `viewFormat`, or
         * - `format` and `viewFormat` differ only in whether they are `srgb` formats (have the `-srgb` suffix).
         * </div>
         */
        viewFormats?: Iterable<GPUTextureFormat>;
    }

}
