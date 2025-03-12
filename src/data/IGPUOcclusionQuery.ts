import { OcclusionQuery } from "@feng3d/render-api";

declare module "@feng3d/render-api"
{
    export interface OcclusionQuery
    {
        /**
         * 临时变量, 执行过程中由引擎自动填充
         *
         * @internal
         */
        _queryIndex?: GPUSize32;

        _version?: number;
    }
}

