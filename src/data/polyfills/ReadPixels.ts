import { TextureLike } from "@feng3d/render-api";

declare module "@feng3d/render-api"
{
    export interface ReadPixels
    {
        /**
         * GPU纹理
         */
        texture: TextureLike,
    }
}
