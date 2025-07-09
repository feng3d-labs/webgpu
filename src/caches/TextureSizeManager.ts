import { computed, Computed, reactive } from '@feng3d/reactivity';
import { CanvasTexture, TextureLike, TextureSize } from '@feng3d/render-api';

export class TextureSizeManager
{
    /**
     * 获取纹理尺寸。
     *
     * @param texture 纹理。
     * @returns 纹理尺寸。
     */
    static getTextureSize(texture: TextureLike)
    {
        let result = TextureSizeManager.getTextureSizeMap.get(texture);

        if (result) return result.value;

        result = computed(() =>
        {
            if ('context' in texture)
            {
                // 监听
                const r_texture = reactive(texture);

                r_texture.context.canvasId;

                // 计算
                const element = typeof texture.context.canvasId === 'string' ? document.getElementById(texture.context.canvasId) as HTMLCanvasElement : texture.context.canvasId;

                console.assert(!!element, `在 document 上没有找到 canvasId 为 ${(texture as CanvasTexture).context.canvasId} 的画布。`);

                return [element.width, element.height, 1] as TextureSize;
            }
            // 监听
            const r_size = reactive(texture.descriptor.size);

            r_size[0];
            r_size[1];
            r_size[2];

            return texture.descriptor.size;
        });
        TextureSizeManager.getTextureSizeMap.set(texture, result);

        return result.value;
    }

    private static readonly getTextureSizeMap = new WeakMap<TextureLike, Computed<TextureSize>>();
}
