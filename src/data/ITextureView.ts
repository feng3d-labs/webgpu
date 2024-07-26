import { IGPUTextureView } from "./IGPUTextureView";
import { ITexture } from "./ITexture";

/**
 * @see IGPUTextureView
 */
export interface ITextureView extends Omit<IGPUTextureView, "texture">
{
    texture: ITexture;
}
