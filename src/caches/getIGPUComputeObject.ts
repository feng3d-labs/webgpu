import { IGPUComputeObject } from "../data/IGPUComputeObject";
import { getIGPUComputePipeline } from "./getIGPUComputePipeline";
import { getIGPUSetBindGroups } from "./getIGPUSetBindGroups";

export function getIGPUComputeObject(computeObject: IGPUComputeObject)
{
    const { gpuComputePipeline, bindingResourceInfoMap } = getIGPUComputePipeline(computeObject.pipeline);

    const gpuComputeObject: IGPUComputeObject = {
        ...computeObject,
        pipeline: gpuComputePipeline,
    };

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(gpuComputePipeline, computeObject.bindingResources, bindingResourceInfoMap);

    gpuComputeObject.bindGroups = bindGroups;

    return gpuComputeObject;
}
