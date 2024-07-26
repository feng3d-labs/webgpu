import { IGPUTexture } from "./IGPUTexture";

/**
 * 视图纹理。
 *
 * @see GPUTextureView
 * @see GPUTexture.createView
 * @see GPUTextureViewDescriptor
 */
export interface IGPUTextureView extends GPUTextureViewDescriptor
{
    /**
     * 产生视图的纹理。
     */
    texture: IGPUTexture;
}
