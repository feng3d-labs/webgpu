import { OcclusionQuery } from "@feng3d/render-api";
import { RenderBundle } from "../RenderBundle";
import { TimestampQuery } from "../TimestampQuery";

declare module "@feng3d/render-api"
{
    /**
     * GPU渲染通道编码器。
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/GPURenderPassEncoder
     *
     * {@link GPURenderPassEncoder}
     */
    export interface RenderPass
    {
        /**
         * 渲染不被遮挡查询结果。具体数据保存在各子项的"result"属性中。
         *
         * 当提交WebGPU后自动获取结果后填充该属性。
         */
        occlusionQueryResults?: OcclusionQuery[];

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
