import { IGPUTextureView } from 'webgpu-data-driven';

import { ITexture } from './ITexture';

/**
 * @see IGPUTextureView
 */
export interface ITextureView extends Omit<IGPUTextureView, 'texture'>
{
    texture: ITexture;
}
