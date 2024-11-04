
import { IGPUComputePass } from "../data/IGPUComputePass";
import { getIGPUComputeObject } from "./getIGPUComputeObject";

export function getIComputePassEncoder(computePassEncoder: IGPUComputePass)
{
    const computePass = computePassEncoder.descriptor;

    const computeObjects = computePassEncoder.computeObjects.map((v) => getIGPUComputeObject(v));

    const gpuComputePassEncoder: IGPUComputePass = {
        descriptor: computePass,
        computeObjects,
    };

    return gpuComputePassEncoder;
}
