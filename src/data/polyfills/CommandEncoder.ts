import { } from "@feng3d/render-api";
import { GPUComputePass } from "../GPUComputePass";

declare module "@feng3d/render-api"
{
    export interface PassEncoderMap
    {
        GPUComputePass: GPUComputePass;
    }
}
