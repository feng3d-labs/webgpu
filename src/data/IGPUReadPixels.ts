import { IGPUTexture } from "./IGPUTexture";

/**
 * 读取GPU纹理像素
 */
export interface IGPUReadPixels
{
    /**
     * GPU纹理
     */
    texture: IGPUTexture,

    /**
     * 读取位置。
     */
    origin: GPUOrigin3D,

    /**
     * 读取尺寸
     */
    copySize: { width: number, height: number }
}