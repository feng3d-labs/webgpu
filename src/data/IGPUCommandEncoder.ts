import { } from "@feng3d/render-api";
import { IGPUComputePass } from "./IGPUComputePass";

declare module "@feng3d/render-api"
{
    export interface PassEncoderMap
    {
        IGPUComputePass: IGPUComputePass;
    }
}
