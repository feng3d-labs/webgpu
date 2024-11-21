import { IGPURenderBundleObject } from "./IGPURenderBundleObject";
import { IGPURenderObject } from "./IGPURenderObject";
import { IGPURenderOcclusionQueryObject } from "./IGPURenderOcclusionQueryObject";
import { IGPURenderPassDescriptor } from "./IGPURenderPassDescriptor";

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
     * 渲染通道描述。
     */
    descriptor: IGPURenderPassDescriptor;

    /**
     * 渲染对象列表
     */
    renderObjects?: (IGPURenderObject | IGPURenderBundleObject | IGPURenderOcclusionQueryObject)[];

    /**
     * 渲染不被遮挡查询结果。具体数据保存在各子项的"result"属性中。
     * 
     * 当提交WebGPU后自动获取结果后填充该属性。
     */
    _occlusionQueryResults?: IGPURenderOcclusionQueryObject[];
}
