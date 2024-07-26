import { IGPUTexture } from "./IGPUTexture";

/**
 * GPU纹理间拷贝所包含信息。
 *
 * {@link GPUCommandEncoder.copyTextureToTexture}
 */
export interface IGPUCopyTextureToTexture
{
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
export interface IGPUImageCopyTexture extends Omit<GPUImageCopyTexture, "texture">
{
    /**
     * Texture to copy to/from.
     */
    texture: IGPUTexture;
}
