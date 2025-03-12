import { } from "@feng3d/render-api";
import { ComputePass } from "../ComputePass";

declare module "@feng3d/render-api"
{
    export interface PassEncoderMap
    {
        GPUComputePass: ComputePass;
    }
}
