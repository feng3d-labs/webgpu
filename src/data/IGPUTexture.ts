import { ITexture, ITextureImageSource, ITextureOrigin, ITextureSize } from "@feng3d/render-api";
import { IGPUCanvasTexture } from "./IGPUCanvasTexture";

/**
 * 类似纹理，包含画布纹理以及正常纹理。
 */
export type IGPUTextureLike = IGPUCanvasTexture | IGPUTexture;

/**
 * @see GPUTextureDescriptor
 */
export interface IGPUTexture extends ITexture
{
    /**
     * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
     */
    readonly label?: string;

    /**
     * 纹理资源。
     *
     * @see GPUQueue.copyExternalImageToTexture
     * @see GPUQueue.writeTexture
     */
    sources?: readonly IGPUTextureSource[];

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

/**
 * 纹理资源
 * 
 * @see GPUQueue.copyExternalImageToTexture
 * @see GPUQueue.writeTexture
 */
export type IGPUTextureSource = IGPUTextureImageSource | IGPUTextureBufferSource;

/**
 * 纹理的数据资源。
 * 
 * @see GPUQueue.writeTexture
 */
export interface IGPUTextureBufferSource
{
    /**
     * Data to write into `destination`.
     * 
     * 包含纹理的数据。
     */
    data: BufferSource | SharedArrayBuffer,

    /**
     * Layout of the content in `data`.
     *
     * 纹理数据布局。
     */
    dataLayout: IGPUImageDataLayout,

    /**
     * Mip-map level of the {@link GPUImageCopyTexture#texture} to copy to/from.
     * 
     * 写入纹理的mipmap层级索引。
     */
    mipLevel?: number;

    /**
     * Defines the origin of the copy - the minimum corner of the texture sub-region to copy to/from.
     * Together with `copySize`, defines the full copy sub-region.
     * 
     * 写入纹理的位置。
     */
    textureOrigin?: ITextureOrigin;

    /**
     * Extents of the content to write from `data` to `destination`.
     * 
     * 写入尺寸。
     */
    size: ITextureSize

    /**
     * Defines which aspects of the {@link GPUImageCopyTexture#texture} to copy to/from.
     * 
     * 写入纹理哪部分内容。
     */
    aspect?: GPUTextureAspect;
}

/**
 * 写入纹理的数据布局描述。
 * 
 * @see GPUImageDataLayout
 */
export interface IGPUImageDataLayout
{
    /**
     * The offset, in bytes, from the beginning of the image data source (such as a
     * {@link GPUImageCopyBuffer#buffer|GPUImageCopyBuffer.buffer}) to the start of the image data
     * within that source.
     * 
     * 读取数据偏移字节数（起点）。
     */
    offset?: number;

    /**
     * The stride, in bytes, between the beginning of each texel block row and the subsequent
     * texel block row.
     * Required if there are multiple texel block rows (i.e. the copy height or depth is more
     * than one block).
     * 
     * 每行像素所占字节数。
     */
    bytesPerRow?: number;

    /**
     * Number of texel block rows per single texel image of the texture.
     * {@link GPUImageDataLayout#rowsPerImage} &times;
     * {@link GPUImageDataLayout#bytesPerRow} is the stride, in bytes, between the beginning of each
     * texel image of data and the subsequent texel image.
     * Required if there are multiple texel images (i.e. the copy depth is more than one).
     * 
     * 每张图片所占字节数。
     */
    rowsPerImage?: GPUSize32;
}

/**
 * 纹理的图片资源。
 *
 * @see GPUQueue.copyExternalImageToTexture
 */
export interface IGPUTextureImageSource extends ITextureImageSource
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

