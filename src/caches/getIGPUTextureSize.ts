import { IGPUTexture, IGPUTextureBase, IGPUTextureFromContext, IGPUTextureSize } from "../data/IGPUTexture";

/**
 * 获取纹理尺寸。
 *
 * @param texture 纹理。
 * @returns 纹理尺寸。
 */
export function getIGPUTextureSize(texture: IGPUTexture)
{
    if ((texture as IGPUTextureFromContext).context)
    {
        const element = document.getElementById((texture as IGPUTextureFromContext).context.canvasId) as HTMLCanvasElement;
        console.assert(!!element, `在 document 上没有找到 canvasId 为 ${(texture as IGPUTextureFromContext).context.canvasId} 的画布。`);

        return [element.width, element.height, 1] as IGPUTextureSize;
    }

    return (texture as IGPUTextureBase).size;
}
