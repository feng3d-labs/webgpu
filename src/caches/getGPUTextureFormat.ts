import { TextureLike } from "@feng3d/render-api";

/**
 * 获取纹理格式。
 *
 * @param texture 纹理。
 * @returns 纹理格式。
 */
export function getGPUTextureFormat(texture: TextureLike)
{
    if (!texture) return undefined;

    if ("context" in texture)
    {
        const format = texture.context?.configuration?.format || navigator.gpu.getPreferredCanvasFormat();

        return format;
    }

    return texture.format;
}
