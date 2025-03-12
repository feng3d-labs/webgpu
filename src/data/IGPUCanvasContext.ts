import { CanvasContext } from "@feng3d/render-api";
import { CanvasConfiguration } from "./GPUCanvasConfiguration";

declare module "@feng3d/render-api"
{
    /**
     * @see GPUCanvasContext
     * @see GPUCanvasContext.configure
     */
    export interface CanvasContext
    {
        /**
         * 画布配置。默认有引擎自动设置。
         */
        configuration?: CanvasConfiguration;
    }
}
