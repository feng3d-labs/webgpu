import { CanvasContext } from "@feng3d/render-api";
import { IGPUCanvasConfiguration } from "./IGPUCanvasConfiguration";

/**
 * @see GPUCanvasContext
 * @see HTMLCanvasElement.getContext
 * @see GPUCanvasContext.configure
 */
export interface IGPUCanvasContext extends CanvasContext
{
    /**
     * 画布配置。默认有引擎自动设置。
     */
    configuration?: IGPUCanvasConfiguration;
}
