import { IGPUComputePassEncoder } from "../data/IGPUComputePassEncoder";
import { getIGPUComputeObject } from "./getIGPUComputeObject";

export function getIComputePassEncoder(computePassEncoder: IGPUComputePassEncoder)
{
    const computePass = computePassEncoder.computePass;

    const computeObjects = computePassEncoder.computeObjects.map((v) => getIGPUComputeObject(v));

    const gpuComputePassEncoder: IGPUComputePassEncoder = {
        computePass,
        computeObjects,
    };

    return gpuComputePassEncoder;
}
