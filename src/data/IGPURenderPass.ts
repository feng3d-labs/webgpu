import { IGPURenderBundleObject } from "./IGPURenderBundleObject";
import { IGPURenderObject } from "./IGPURenderObject";
import { IGPUOcclusionQueryObject } from "./IGPUOcclusionQueryObject";
import { IGPURenderPassDescriptor } from "./IGPURenderPassDescriptor";
import { IGPUScissorRect } from "./IGPUScissorRect";
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
}

/**
 * 渲染通道中的执行项。
 */
export type IGPURenderPassObject = (IGPUViewport | IGPUScissorRect | IGPURenderObject | IGPURenderBundleObject | IGPUOcclusionQueryObject);