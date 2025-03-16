import { CanvasTexture, TextureLike, TextureSize } from "@feng3d/render-api";

/**
 * 获取纹理尺寸。
 *
 * @param texture 纹理。
 * @returns 纹理尺寸。
 */
export function getTextureSize(texture: TextureLike)
{
    if ("context" in texture)
    {
        const element = document.getElementById(texture.context.canvasId) as HTMLCanvasElement;
        console.assert(!!element, `在 document 上没有找到 canvasId 为 ${(texture as CanvasTexture).context.canvasId} 的画布。`);

        return [element.width, element.height, 1] as TextureSize;
    }

    return texture.size;
}