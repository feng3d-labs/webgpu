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
}