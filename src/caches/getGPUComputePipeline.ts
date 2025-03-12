import { GPU_ComputePipeline } from "../data/GPU_ComputePipeline";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";

export function getGPUComputePipeline(device: GPUDevice, computePipeline: GPU_ComputePipeline)
{
    const computePipelineMap: WeakMap<GPU_ComputePipeline, GPUComputePipeline> = device["_computePipelineMap"] = device["_computePipelineMap"] || new WeakMap();

    let pipeline = computePipelineMap.get(computePipeline);
    if (pipeline) return pipeline;

    // 从GPU管线中获取管线布局。
    const gpuPipelineLayout = getIGPUPipelineLayout({ compute: computePipeline.compute.code });

    const layout = getGPUPipelineLayout(device, gpuPipelineLayout);

    pipeline = device.createComputePipeline({
        layout,
        compute: {
            ...computePipeline.compute,
            module: getGPUShaderModule(device, computePipeline.compute.code),
        },
    });
    computePipelineMap.set(computePipeline, pipeline);

    return pipeline;
}

