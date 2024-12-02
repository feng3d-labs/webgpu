import { IGPUImageCopyTexture } from "./IGPUTexture";

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

