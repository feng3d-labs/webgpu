import { IGPURenderObject } from "./IGPURenderObject";

/**
 * 被查询的渲染对象列表
 */
export interface IGPURenderOcclusionQueryObject
{
    readonly type: "OcclusionQueryObject";

    /**
     * GPU渲染对象列表。
     */
    renderObjects: IGPURenderObject[];

    /**
     * 渲染完成后有引擎自动填充。
     */
    result?: boolean;
}