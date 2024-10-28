import { IGPURenderBundleObject } from "./IGPURenderBundleObject";
import { IGPURenderObject } from "./IGPURenderObject";
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
    renderObjects?: (IGPURenderObject | IGPURenderBundleObject)[];
}
