import { IGPURenderObject } from "./IGPURenderObject";

/**
 * 被查询的渲染对象列表
 */
export interface IGPUOcclusionQuery
{
    /**
     * 数据类型。
     */
    readonly __type: "OcclusionQuery";

    /**
     * GPU渲染对象列表。
     */
    renderObjects: IGPURenderObject[];

    /**
     * 临时变量, 执行过程中由引擎自动填充
     *
     * @internal
     */
    _queryIndex?: GPUSize32;

    /**
     * 渲染完成后由引擎自动填充。
     */
    result?: IGLQueryResult;
}

export interface IGLQueryResult
{
    /**
     * 查询结果。
     */
    result: number;
}