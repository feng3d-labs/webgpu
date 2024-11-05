import { IGPUWorkgroups } from "../data/IGPUComputeObject";

/**
 * 执行计算工作组。
 * 
 * @param passEncoder 计算通道编码器。 
 * @param workgroups 计算工作组。
 */
export function runWorkgroups(passEncoder: GPUComputePassEncoder, workgroups?: IGPUWorkgroups)
{
    const { workgroupCountX, workgroupCountY, workgroupCountZ } = workgroups;
    passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
}
