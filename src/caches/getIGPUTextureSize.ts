import { ITextureSize } from "@feng3d/render-api";
import { IGPUCanvasTexture } from "../data/IGPUCanvasTexture";
import { IGPUTexture, IGPUTextureLike, IGPUTextureSize } from "../data/IGPUTexture";

/**
 * 获取纹理尺寸。
 *
 * @param texture 纹理。
 * @returns 纹理尺寸。
 */
export function getIGPUTextureLikeSize(texture: IGPUTextureLike)
{
    if ((texture as IGPUCanvasTexture).context)
    {
        const element = document.getElementById((texture as IGPUCanvasTexture).context.canvasId) as HTMLCanvasElement;
        console.assert(!!element, `在 document 上没有找到 canvasId 为 ${(texture as IGPUCanvasTexture).context.canvasId} 的画布。`);

        return [element.width, element.height, 1] as IGPUTextureSize;
    }

    return (texture as IGPUTexture).size;
}

export function getIGPUTextureSize(texture: IGPUTexture): ITextureSize
{
    if (texture.size) return texture.size;

    const source = texture.source;
    for (let i = 0; i < source.length; i++)
    {
        const element = source[i];

        if (!element.destination.mipLevel)
        {
            return element.copySize;
        }
    }
    return undefined;
}