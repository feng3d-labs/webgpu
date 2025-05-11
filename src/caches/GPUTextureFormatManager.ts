import { computed, Computed, reactive } from "@feng3d/reactivity";
import { TextureLike } from "@feng3d/render-api";

export class GPUTextureFormatManager
{
    /**
     * 获取纹理格式。
     *
     * @param texture 纹理。
     * @returns 纹理格式。
     */
    static getGPUTextureFormat(texture: TextureLike): GPUTextureFormat
    {
        if (!texture) return undefined;

        let result = this.getGPUTextureFormatMap.get(texture);
        if (result) return result.value;

        result = computed(() =>
        {
            // 监听
            const r_texture = reactive(texture);

            // 计算
            if ("context" in r_texture)
            {
                const format = r_texture.context?.configuration?.format || navigator.gpu.getPreferredCanvasFormat();

                return format;
            }

            return r_texture.format;
        });
        this.getGPUTextureFormatMap.set(texture, result);

        return result.value;
    }

    private static readonly getGPUTextureFormatMap = new WeakMap<TextureLike, Computed<GPUTextureFormat>>();
}
