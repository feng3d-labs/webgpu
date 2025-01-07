import { ICommandEncoder, IRenderPass } from "@feng3d/render-api";
import { IGPUComputePass } from "./IGPUComputePass";

declare module "@feng3d/render-api"
{
    export interface IPassEncoderMap
    {
        IGPUComputePass: IGPUComputePass;
    }
}
