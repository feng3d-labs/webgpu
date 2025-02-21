import { Sampler } from "@feng3d/render-api";
import { IGPUExternalTexture } from "./IGPUExternalTexture";

declare module "@feng3d/render-api"
{
    export interface IUniformTypeMap
    {
        ISampler: Sampler;
        ITextureView: TextureView;
        IGPUExternalTexture: IGPUExternalTexture;
    }
}