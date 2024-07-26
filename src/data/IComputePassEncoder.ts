import { IGPUComputePassEncoder } from 'webgpu-data-driven';
import { IComputeObject } from './IComputeObject';

export interface IComputePassEncoder extends Omit<IGPUComputePassEncoder, 'computeObjects'>
{
    /**
     * 计算对象列表。
     */
    computeObjects: IComputeObject[];
}
