import { IGPUComputeObject } from "./IGPUComputeObject";
import { IGPUTimestampQuery } from "./IGPUTimestampQuery";

/**
 * GPU计算通道编码器。
 *
 * @see GPUCommandEncoder.beginComputePass
 * @see GPUComputePassEncoder
 */
export interface IGPUComputePass
{
    /**
     * 数据类型。
     */
    readonly __type: "IGPUComputePass";

    /**
     * 计算对象列表。
     */
    computeObjects: IGPUComputeObject[];

    /**
     * 查询通道运行消耗时长（单位为纳秒）。
     *
     * 如果需要查询通道运行消耗时长，需要为该属性赋值，如 `pass.timestampQuery = {};`。WebGPU渲染完成后引擎自动填充结果到属性`elapsedNs`。
     */
    timestampQuery?: IGPUTimestampQuery;
}
