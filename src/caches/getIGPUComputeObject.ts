import { IGPUComputeObject } from "../data/IGPUComputeObject";
import { getIGPUComputePipeline } from "./getIGPUComputePipeline";
import { getIGPUSetBindGroups } from "./getIGPUSetBindGroups";

export function getIGPUComputeObject(renderObject: IGPUComputeObject)
{
    const { gpuComputePipeline, bindingResourceInfoMap } = getIGPUComputePipeline(renderObject.pipeline);

    const gpuComputeObject: IGPUComputeObject = {
        ...renderObject,
        pipeline: gpuComputePipeline,
    };

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(gpuComputePipeline, renderObject.bindingResources, bindingResourceInfoMap);

    gpuComputeObject.bindGroups = bindGroups;

    return gpuComputeObject;
}
