import { ICommandEncoder, IRenderPass } from "@feng3d/render-api";
import { IGPUComputePass } from "./IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "./IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./IGPUCopyTextureToTexture";

declare module "@feng3d/render-api"
{
    export interface IPassEncoderMap
    {
        IGPUComputePass: IGPUComputePass;
        IGPUCopyTextureToTexture: IGPUCopyTextureToTexture;
        IGPUCopyBufferToBuffer: IGPUCopyBufferToBuffer;
    }
}
