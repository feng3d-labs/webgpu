import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getIGPUComputePipeline } from "../caches/getIGPUComputePipeline";
import { getIGPUSetBindGroups } from "../caches/getIGPUSetBindGroups";
import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPUComputePipeline } from "../data/IGPUComputeObject";

/**
 * 执行计算绑定组。
 * 
 * @param device GPU设备。
 * @param passEncoder 计算通道编码器。
 * @param pipeline 计算管线。
 * @param bindingResources 绑定资源。
 */
export function runComputeBindGroup(device: GPUDevice, passEncoder: GPUComputePassEncoder, pipeline: IGPUComputePipeline, bindingResources?: IGPUBindingResources)
{
    const { gpuComputePipeline, bindingResourceInfoMap } = getIGPUComputePipeline(pipeline);

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(gpuComputePipeline.layout, bindingResources, bindingResourceInfoMap);

    bindGroups?.forEach((bindGroup, index) =>
    {
        const gpuBindGroup = getGPUBindGroup(device, bindGroup.bindGroup);
        passEncoder.setBindGroup(index, gpuBindGroup, bindGroup.dynamicOffsets);
    });
}