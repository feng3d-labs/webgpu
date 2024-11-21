import { getGPUComputePipeline } from "../caches/getGPUComputePipeline";
import { getIGPUComputePipeline } from "../caches/getIGPUComputePipeline";
import { IGPUComputeObject } from "../data/IGPUComputeObject";
import { runBindGroup } from "./runBindGroup";
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
    const { gpuComputePipeline, bindingResourceInfoMap } = getIGPUComputePipeline(computeObject.pipeline);

    const computePipeline = getGPUComputePipeline(device, gpuComputePipeline);
    passEncoder.setPipeline(computePipeline);

    runBindGroup(device, passEncoder, gpuComputePipeline.layout, computeObject.bindingResources, bindingResourceInfoMap);

    runWorkgroups(passEncoder, computeObject.workgroups);
}