import { Texture } from '@feng3d/render-api';

/**
 * 多重采样纹理，一般只在渲染通道中需要解决多重采样时使用。
 */
export interface MultisampleTexture extends Texture
{
    /**
     * The sample count of the texture. A {@link GPUTextureDescriptor#sampleCount} &gt; `1` indicates
     * a multisampled texture.
     *
     * WebGPU只支持4重采样。
     */
    sampleCount: 4;
}