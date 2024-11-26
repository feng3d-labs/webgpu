import { IGPUComputeObject } from "./IGPUComputeObject";

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
     * GPU计算通道描述。
     */
    descriptor?: IGPUComputePassDescriptor;

    /**
     * 计算对象列表。
     */
    computeObjects: IGPUComputeObject[]
}

/**
 * GPU计算通道描述。
 */
export interface IGPUComputePassDescriptor extends GPUComputePassDescriptor
{

}
