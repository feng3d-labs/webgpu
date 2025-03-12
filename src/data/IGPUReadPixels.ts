import { TextureLike, ReadPixels } from "@feng3d/render-api";

/**
 * 读取GPU纹理像素
 */
export interface IGPUReadPixels extends ReadPixels
{
    /**
     * GPU纹理
     */
    texture: TextureLike,

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