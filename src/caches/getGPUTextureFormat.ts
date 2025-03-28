import { computed, Computed, reactive, TextureLike } from "@feng3d/render-api";

/**
 * 获取纹理格式。
 *
 * @param texture 纹理。
 * @returns 纹理格式。
 */
export function getGPUTextureFormat(texture: TextureLike): GPUTextureFormat
{
    if (!texture) return undefined;

    let result = getGPUTextureFormatMap.get(texture);
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
    getGPUTextureFormatMap.set(texture, result);

    return result.value;
}

const getGPUTextureFormatMap = new WeakMap<TextureLike, Computed<GPUTextureFormat>>();