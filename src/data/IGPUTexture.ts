import { ITexture } from "@feng3d/render-api";
import { IGPUCanvasTexture } from "./IGPUCanvasTexture";

/**
 * 类似纹理，包含画布纹理以及正常纹理。
 */
export type IGPUTextureLike = IGPUCanvasTexture | IGPUTexture;

export type IGPUTextureSize = [width: number, height?: number, depthOrArrayLayers?: number];

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
     * The width, height, and depth or layer count of the texture.
     */
    size: IGPUTextureSize;

    /**
     * 初始纹理数据。
     *
     * 使用 GPUQueue.copyExternalImageToTexture 进行初始化。
     *
     * @see GPUQueue.copyExternalImageToTexture
     */
    source?: IGPUTextureImageSource[];

    /**
     * 是否生成 mipmap。
     */
    readonly generateMipmap?: boolean;

    /**
     * 向纹理中写入数据。
     *
     * @see GPUQueue.writeTexture
     */
    writeTextures?: IGPUWriteTexture[];

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
 * 写纹理 GPUQueue.writeTexture 参数列表。
 *
 * @see GPUQueue.writeTexture
 */
export interface IGPUWriteTexture
{
    destination?: IGPUWriteTextureDestination,
    data: BufferSource | SharedArrayBuffer,
    dataLayout: GPUImageDataLayout,
    size: GPUExtent3DStrict
}

export interface IGPUTextureImageSource
{
    source: GPUImageCopyExternalImage,
    destination: IGPUTextureSourceDestination,
    copySize: GPUExtent3DStrict
}

export interface IGPUTextureSourceDestination extends IGPUWriteTextureDestination
{
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
    /**
     * Describes whether the data written into the texture should have its RGB channels
     * premultiplied by the alpha channel, or not.
     * If this option is set to `true` and the {@link GPUImageCopyExternalImage#source} is also
     * premultiplied, the source RGB values must be preserved even if they exceed their
     * corresponding alpha values.
     * Note:
     * If {@link GPUImageCopyTextureTagged#premultipliedAlpha} matches the source image,
     * conversion may not be necessary. See [[#color-space-conversion-elision]].
     */
    premultipliedAlpha?: boolean;
}

/**
 * @see GPUImageCopyTexture
 */
export interface IGPUWriteTextureDestination
{
    /**
     * Mip-map level of the {@link GPUImageCopyTexture#texture} to copy to/from.
     */
    mipLevel?: GPUIntegerCoordinate;
    /**
     * Defines the origin of the copy - the minimum corner of the texture sub-region to copy to/from.
     * Together with `copySize`, defines the full copy sub-region.
     */
    origin?: GPUOrigin3D;
    /**
     * Defines which aspects of the {@link GPUImageCopyTexture#texture} to copy to/from.
     */
    aspect?: GPUTextureAspect;
}
