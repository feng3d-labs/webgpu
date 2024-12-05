import { IGPUTextureLike } from "./IGPUTexture";

/**
 * GPU纹理间拷贝所包含信息。
 *
 * {@link GPUCommandEncoder.copyTextureToTexture}
 */
export interface IGPUCopyTextureToTexture
{
    /**
     * 数据类型。
     */
    readonly __type: "IGPUCopyTextureToTexture";

    /**
     * Combined with `copySize`, defines the region of the source texture subresources.
     */
    source: IGPUImageCopyTexture,

    /**
     * Combined with `copySize`, defines the region of the destination texture subresources.
     */
    destination: IGPUImageCopyTexture,

    /**
     * 拷贝的尺寸。
     */
    copySize: GPUExtent3DStrict;
}

/**
 * 被操作的纹理相关信息。
 *
 * {@link GPUCommandEncoder.copyTextureToTexture}
 * {@link GPUImageCopyTexture}
 */
export interface IGPUImageCopyTexture
{
    /**
     * Texture to copy to/from.
     */
    texture: IGPUTextureLike;
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