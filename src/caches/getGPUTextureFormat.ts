import { IGPUCanvasTexture } from "../data/IGPUCanvasTexture";
import { IGPUTexture, IGPUTextureLike } from "../data/IGPUTexture";

/**
 * 获取纹理格式。
 *
 * @param texture 纹理。
 * @returns 纹理格式。
 */
export function getGPUTextureFormat(texture: IGPUTextureLike)
{
    if (!texture) return undefined;

    if ((texture as IGPUCanvasTexture).context)
    {
        const format = (texture as IGPUCanvasTexture).context?.configuration?.format || navigator.gpu.getPreferredCanvasFormat();

        return format;
    }

    return (texture as IGPUTexture).format;
}