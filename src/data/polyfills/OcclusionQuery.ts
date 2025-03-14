import { OcclusionQuery } from "@feng3d/render-api";

declare module "@feng3d/render-api"
{
    export interface OcclusionQuery
    {
        _version?: number;
    }
}

