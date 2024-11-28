import { IGPUBlendConstant } from "./IGPUBlendConstant";
import { IGPUOcclusionQueryObject } from "./IGPUOcclusionQueryObject";
import { IGPURenderBundleObject } from "./IGPURenderBundleObject";
import { IGPURenderObject } from "./IGPURenderObject";
import { IGPURenderPassDescriptor } from "./IGPURenderPassDescriptor";
import { IGPUScissorRect } from "./IGPUScissorRect";
import { IGPUStencilReference } from "./IGPUStencilReference";
import { IGPUTimestampQuery } from "./IGPUTimestampQuery";
import { IGPUViewport } from "./IGPUViewport";

/**
 * GPU渲染通道编码器。
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/GPURenderPassEncoder
 *
 * {@link GPURenderPassEncoder}
 */
export interface IGPURenderPass
{
    /**
     * 数据类型。
     */
    readonly __type?: "IGPURenderPass";

    /**
     * 渲染通道描述。
     */
    descriptor: IGPURenderPassDescriptor;

    /**
     * 渲染对象列表
     */
    renderObjects?: IGPURenderPassObject[];

    /**
     * 渲染不被遮挡查询结果。具体数据保存在各子项的"result"属性中。
     * 
     * 当提交WebGPU后自动获取结果后填充该属性。
     */
    occlusionQueryResults?: IGPUOcclusionQueryObject[];

    /**
     * 查询通道运行消耗时长（单位为纳秒）。
     * 
     * 如果需要查询通道运行消耗时长，需要为该属性赋值，如 `pass.timestampQuery = {};`。WebGPU渲染完成后引擎自动填充结果到属性`elapsedNs`。
     */
    timestampQuery?: IGPUTimestampQuery;
}

/**
 * 渲染通道中的执行项。
 */
export type IGPURenderPassObject = (IGPURenderObject | IGPUViewport | IGPUScissorRect | IGPURenderBundleObject | IGPUOcclusionQueryObject | IGPUBlendConstant | IGPUStencilReference);
