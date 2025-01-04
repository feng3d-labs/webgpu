import { ISampler } from "@feng3d/render-api";
import { IGPUBufferBinding } from "./IGPUBufferBinding";
import { IGPUExternalTexture } from "./IGPUExternalTexture";

declare module "@feng3d/render-api"
{
    export interface IUniformTypeMap
    {
        ISampler: ISampler;
        ITextureView: ITextureView;
        IGPUBufferBinding: IGPUBufferBinding;
        IGPUExternalTexture: IGPUExternalTexture;
    }
}