import { getGPUComputePipeline } from "../caches/getGPUComputePipeline";
import { getIGPUComputePipeline } from "../caches/getIGPUComputePipeline";
import { IGPUComputePipeline } from "../data/IGPUComputeObject";

export function runComputePipeline(device: GPUDevice, passEncoder: GPUComputePassEncoder, pipeline: IGPUComputePipeline)
{
    const { gpuComputePipeline } = getIGPUComputePipeline(pipeline);

    const computePipeline = getGPUComputePipeline(device, gpuComputePipeline);
    passEncoder.setPipeline(computePipeline);
}
