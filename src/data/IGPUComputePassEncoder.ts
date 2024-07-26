import { IGPUComputeObject } from "./IGPUComputeObject";

/**
 * GPU计算通道编码器。
 *
 * @see GPUCommandEncoder.beginComputePass
 * @see GPUComputePassEncoder
 */
export interface IGPUComputePassEncoder
{
    /**
     * GPU计算通道描述。
     */
    computePass?: IGPUComputePass;

    /**
     * 计算对象列表。
     */
    computeObjects: IGPUComputeObject[]
}

/**
 * GPU计算通道描述。
 */
export interface IGPUComputePass extends GPUComputePassDescriptor
{

}
