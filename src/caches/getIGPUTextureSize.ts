import { getTexImageSourceSize, ITextureImageSource, ITextureLike, ITextureSize } from "@feng3d/render-api";
import { IGPUCanvasTexture } from "../data/IGPUCanvasTexture";

/**
 * 获取纹理尺寸。
 *
 * @param texture 纹理。
 * @returns 纹理尺寸。
 */
export function getIGPUTextureLikeSize(texture: ITextureLike)
{
    if ("context" in texture)
    {
        const element = document.getElementById(texture.context.canvasId) as HTMLCanvasElement;
        console.assert(!!element, `在 document 上没有找到 canvasId 为 ${(texture as IGPUCanvasTexture).context.canvasId} 的画布。`);

        return [element.width, element.height, 1] as ITextureSize;
    }

    return texture.size;
}

export function getIGPUTextureSourceSize(source?: ITextureImageSource[]): ITextureSize
{
    if (!source) return undefined;

    let width: number;
    let height: number;
    let maxDepthOrArrayLayers = 0;

    for (let i = 0; i < source.length; i++)
    {
        const element = source[i];
        // 获取mipLevel为0的资源尺寸。
        if (!element.mipLevel)
        {
            const copySize = element.size || getTexImageSourceSize(element.image);
            if (width || height)
            {
                console.assert(width === copySize[0] && height === copySize[1], `纹理资源中提供的尺寸不正确！`);
            }
            else
            {
                width = copySize[0];
                height = copySize[1];
            }

            maxDepthOrArrayLayers = Math.max(maxDepthOrArrayLayers, element.textureOrigin?.[2] || 0);
        }
    }

    console.assert(width > 0 && height > 0, `没有从纹理资源中找到合适的尺寸！`);

    return [width, height, maxDepthOrArrayLayers + 1]; // 总深度比最大深度大1
}