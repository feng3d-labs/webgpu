import { Sampler } from "@feng3d/render-api";
import { VideoTexture } from "../VideoTexture";

declare module "@feng3d/render-api"
{
    export interface UniformTypeMap
    {
        Sampler: Sampler;
        TextureView: TextureView;
        VideoTexture: VideoTexture;
    }
}