import { IGPUBlendComponent } from "./IGPUBlendComponent";

export interface IGPUBlendState
{
    /**
     * Defines the blending behavior of the corresponding render target for color channels.
     */
    readonly color: IGPUBlendComponent;
    /**
     * Defines the blending behavior of the corresponding render target for the alpha channel.
     */
    readonly alpha: IGPUBlendComponent;
}