import { CanvasTexture, computed, Computed, reactive, TextureLike, TextureSize } from "@feng3d/render-api";

/**
 * 获取纹理尺寸。
 *
 * @param texture 纹理。
 * @returns 纹理尺寸。
 */
export function getTextureSize(texture: TextureLike)
{
    let result = getTextureSizeMap.get(texture);
    if (result) return result.value;

    result = computed(() =>
    {
        if ("context" in texture)
        {
            // 监听
            const r_texture = reactive(texture);
            r_texture.context.canvasId;

            // 计算
            const element = typeof texture.context.canvasId === "string" ? document.getElementById(texture.context.canvasId) as HTMLCanvasElement : texture.context.canvasId;
            console.assert(!!element, `在 document 上没有找到 canvasId 为 ${(texture as CanvasTexture).context.canvasId} 的画布。`);

            return [element.width, element.height, 1] as TextureSize;
        }
        // 监听
        const r_texture = reactive(texture);
        r_texture.size[0];
        r_texture.size[1];
        r_texture.size[2];

        return texture.size;
    });
    getTextureSizeMap.set(texture, result);

    return result.value;
}
const getTextureSizeMap = new WeakMap<TextureLike, Computed<TextureSize>>();