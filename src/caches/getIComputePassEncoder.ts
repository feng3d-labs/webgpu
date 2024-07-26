import { IGPUComputePassEncoder } from 'webgpu-data-driven';
import { IComputePassEncoder } from '../data/IComputePassEncoder';
import { getIGPUComputeObject } from './getIGPUComputeObject';

export function getIComputePassEncoder(computePassEncoder: IComputePassEncoder)
{
    const computePass = computePassEncoder.computePass;

    const computeObjects = computePassEncoder.computeObjects.map((v) => getIGPUComputeObject(v));

    const gpuComputePassEncoder: IGPUComputePassEncoder = {
        computePass,
        computeObjects,
    };

    return gpuComputePassEncoder;
}
