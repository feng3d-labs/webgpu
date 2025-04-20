import { OcclusionQuery } from "@feng3d/render-api";
import { RenderBundle } from "../RenderBundle";
import { TimestampQuery } from "../TimestampQuery";

declare module "@feng3d/render-api"
{
    export interface RenderPassDescriptor
    {
        /**
         * 查询通道运行消耗时长（单位为纳秒）。
         *
         * 如果需要查询通道运行消耗时长，需要为该属性赋值，如 `pass.timestampQuery = {};`。WebGPU渲染完成后引擎自动填充结果到属性`elapsedNs`。
         */
        timestampQuery?: TimestampQuery;
    }

    export interface RenderPassObjectMap
    {
        RenderBundle: RenderBundle;
    }
}
