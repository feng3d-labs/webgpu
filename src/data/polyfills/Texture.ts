import { Texture } from '../Texture';

declare module '../Texture'
{
    /**
     * 纹理的图片资源。
     *
     * @see GPUQueue.copyExternalImageToTexture
     */
    export interface TextureImageSource
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
    export interface TextureDataSource
    {
        /**
         * Defines which aspects of the {@link GPUImageCopyTexture#texture} to copy to/from.
         *
         * 写入纹理哪部分内容。
         */
        aspect?: GPUTextureAspect;
    }
}
