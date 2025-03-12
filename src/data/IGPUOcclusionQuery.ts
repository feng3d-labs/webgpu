import { OcclusionQuery } from "@feng3d/render-api";

/**
 * 被查询的渲染对象列表
 */
export interface IGPUOcclusionQuery extends OcclusionQuery
{
    /**
     * 临时变量, 执行过程中由引擎自动填充
     *
     * @internal
     */
    _queryIndex?: GPUSize32;

    _version?: number;
}
