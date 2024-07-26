import { IGPUTexture } from "./IGPUTexture";
import { IGPUTextureView } from "./IGPUTextureView";

/**
 * @see IGPUTextureView
 */
export interface ITextureView extends Omit<IGPUTextureView, "texture">
{
    texture: IGPUTexture;
}
