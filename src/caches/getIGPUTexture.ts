import { IGPUTexture, IGPUTextureSize } from "../data/IGPUTexture";
import { getGPUTexture } from "./getGPUTexture";

/**
 * 获取纹理尺寸。
 *
 * @param texture 纹理。
 * @returns 纹理尺寸。
 */
export function getGPUTextureSize(device: GPUDevice, texture: IGPUTexture)
{
    const gpuTexture = getGPUTexture(device, texture);

    const size: IGPUTextureSize = [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers];

    return size;
}
