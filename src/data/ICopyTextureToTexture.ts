import { IGPUCopyTextureToTexture, IGPUImageCopyTexture } from '../webgpu-data-driven/data/IGPUCopyTextureToTexture';
import { ITexture } from './ITexture';

export interface ICopyTextureToTexture extends Omit<IGPUCopyTextureToTexture, 'source' | 'destination'>
{
    source: IImageCopyTexture,
    destination: IImageCopyTexture,
}

export interface IImageCopyTexture extends Omit<IGPUImageCopyTexture, 'texture'>
{
    /**
     * Texture to copy to/from.
     */
    texture: ITexture;
}
