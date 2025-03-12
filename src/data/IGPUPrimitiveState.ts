import { PrimitiveState } from "@feng3d/render-api";

declare module "@feng3d/render-api"
{
    /**
     * {@link GPUPrimitiveState}
     *
     * `stripIndexFormat` 将由引擎自动设置。
     */
    export interface PrimitiveState
    {
        /**
         * If true, indicates that depth clipping is disabled.
         * Requires the {@link GPUFeatureName#"depth-clip-control"} feature to be enabled.
         */
        unclippedDepth?: boolean;
    }

}
