import { getGPUComputePipeline } from "../caches/getGPUComputePipeline";
import { getIGPUComputePipeline } from "../caches/getIGPUComputePipeline";
import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPUComputeObject, IGPUComputePipeline } from "../data/IGPUComputeObject";
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
    const { pipeline, bindingResources, workgroups } = computeObject;

    runComputePipeline(device, passEncoder, pipeline);

    runComputeBindGroup(device, passEncoder, pipeline, bindingResources);

    runWorkgroups(passEncoder, workgroups);
}

export function runComputePipeline(device: GPUDevice, passEncoder: GPUComputePassEncoder, pipeline: IGPUComputePipeline)
{
    const { gpuComputePipeline } = getIGPUComputePipeline(pipeline);

    const computePipeline = getGPUComputePipeline(device, gpuComputePipeline);
    passEncoder.setPipeline(computePipeline);
}

export function runComputeBindGroup(device: GPUDevice, passEncoder: GPUComputePassEncoder, pipeline: IGPUComputePipeline, bindingResources?: IGPUBindingResources)
{
    const { gpuComputePipeline, bindingResourceInfoMap } = getIGPUComputePipeline(pipeline);
    runBindGroup(device, passEncoder, gpuComputePipeline.layout, bindingResources, bindingResourceInfoMap);
}