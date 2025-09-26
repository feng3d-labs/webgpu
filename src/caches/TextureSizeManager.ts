import { computed, Computed, reactive } from '@feng3d/reactivity';
import { CanvasTexture, TextureLike, TextureSize } from '@feng3d/render-api';
import { WGPUTextureLike } from './WGPUTextureLike';

export class TextureSizeManager
{
    /**
     * 获取纹理尺寸。
     *
     * @param texture 纹理。
     * @returns 纹理尺寸。
     */
    static getTextureSize(device: GPUDevice, texture: TextureLike)
    {
        const gpuTextureLike = WGPUTextureLike.getInstance(device, texture);
        const gpuTexture = gpuTextureLike.gpuTexture;
        return [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers] as TextureSize;
    }
}
