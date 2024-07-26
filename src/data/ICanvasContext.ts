import { ICanvasConfiguration } from "./ICanvasConfiguration";
import { IGPUCanvasContext } from "./IGPUTexture";

/**
 * @see IGPUCanvasContext
 */
export interface ICanvasContext extends Omit<IGPUCanvasContext, "configuration">
{
    /**
     * 画布配置。
     */
    configuration?: ICanvasConfiguration;
}
