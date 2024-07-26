import { IComputeObject } from "./IComputeObject";
import { IGPUComputePassEncoder } from "./IGPUComputePassEncoder";

export interface IComputePassEncoder extends Omit<IGPUComputePassEncoder, "computeObjects">
{
    /**
     * 计算对象列表。
     */
    computeObjects: IComputeObject[];
}
