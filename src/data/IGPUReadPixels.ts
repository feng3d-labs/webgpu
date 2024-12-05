import { IGPUTextureLike } from "./IGPUTexture";

/**
 * 读取GPU纹理像素
 */
export interface IGPUReadPixels
{
    /**
     * GPU纹理
     */
    texture: IGPUTextureLike,

    /**
     * 读取位置。
     */
    origin: GPUOrigin3D,

    /**
     * 读取尺寸
     */
    copySize: { width: number, height: number }

    /**
     * 用于保存最后结果。
     */
    result?: Uint8Array;
}