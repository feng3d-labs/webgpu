import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getGPUComputePipeline } from "../caches/getGPUComputePipeline";
import { getIGPUComputePipeline } from "../caches/getIGPUComputePipeline";
import { getIGPUSetBindGroups } from "../caches/getIGPUSetBindGroups";
import { IGPUComputeObject } from "../data/IGPUComputeObject";

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

    const { gpuComputePipeline: iGPUComputePipeline, bindingResourceInfoMap } = getIGPUComputePipeline(pipeline);

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(iGPUComputePipeline, bindingResources, bindingResourceInfoMap);

    const gpuComputePipeline = getGPUComputePipeline(device, iGPUComputePipeline);
    passEncoder.setPipeline(gpuComputePipeline);

    bindGroups?.forEach((bindGroup, index) =>
    {
        const gpuBindGroup = getGPUBindGroup(device, bindGroup.bindGroup);
        passEncoder.setBindGroup(index, gpuBindGroup, bindGroup.dynamicOffsets);
    });

    const { workgroupCountX, workgroupCountY, workgroupCountZ } = workgroups;
    passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
}