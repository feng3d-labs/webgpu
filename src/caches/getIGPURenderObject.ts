import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { getIGPURenderPipeline } from "./getIGPURenderPipeline";
import { getIGPUSetBindGroups } from "./getIGPUSetBindGroups";

export function getIGPURenderObject(device: GPUDevice, renderObject: IGPURenderObject, renderPass: IGPURenderPassDescriptor)
{
    const { pipeline, vertexBuffers, bindingResourceInfoMap } = getIGPURenderPipeline(device, renderObject.pipeline, renderPass, renderObject.vertices);

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(pipeline, renderObject.bindingResources, bindingResourceInfoMap);

    return { pipeline, vertexBuffers, bindGroups };
}
