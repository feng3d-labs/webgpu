import { IGPUComputeObject } from "../data/IGPUComputeObject";
import { runComputeBindGroup } from "./runComputeBindGroup";
import { runComputePipeline } from "./runComputePipeline";
import { runWorkgroups } from "./runWorkgroups";

/**
 * 执行计算对象。
 * 
 * @param device GPU设备。
 * @param passEncoder 计算通道编码器。
 * @param computeObject 计算对象。
 */
export function runComputeObject(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObject: IGPUComputeObject)
{
    runComputePipeline(device, passEncoder, computeObject.pipeline);

    runComputeBindGroup(device, passEncoder, computeObject.pipeline, computeObject.bindingResources);

    runWorkgroups(passEncoder, computeObject.workgroups);
}