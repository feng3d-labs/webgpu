import { IGPUTexture, IGPUTextureBase, IGPUTextureFromContext } from "../data/IGPUTexture";

/**
 * 获取纹理格式。
 *
 * @param texture 纹理。
 * @returns 纹理格式。
 */
export function getGPUTextureFormat(texture: IGPUTexture)
{
    if (!texture) return undefined;

    if ((texture as IGPUTextureFromContext).context)
    {
        const format = (texture as IGPUTextureFromContext).context?.configuration?.format || navigator.gpu.getPreferredCanvasFormat();

        return format;
    }

    return (texture as IGPUTextureBase).format;
}