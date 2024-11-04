import { IGPUTexture } from "../data/IGPUTexture";
import { getGPUTexture } from "./getGPUTexture";

/**
 * 获取纹理格式。
 *
 * @param texture 纹理。
 * @returns 纹理格式。
 */
export function getGPUTextureFormat(device: GPUDevice, texture: IGPUTexture)
{
    const gpuTexture = getGPUTexture(device, texture);

    return gpuTexture.format;
}