import { IGPUComputePipeline } from "../data/IGPUComputePipeline";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";

export function getGPUComputePipeline(device: GPUDevice, descriptor: IGPUComputePipeline)
{
    const computePipelineMap: WeakMap<IGPUComputePipeline, GPUComputePipeline> = device["_computePipelineMap"] = device["_computePipelineMap"] || new WeakMap();

    let pipeline = computePipelineMap.get(descriptor);
    if (pipeline) return pipeline;

    // 从GPU管线中获取管线布局。
    const gpuPipelineLayout = getIGPUPipelineLayout(descriptor);

    const layout = getGPUPipelineLayout(device, gpuPipelineLayout);

    pipeline = device.createComputePipeline({
        layout,
        compute: {
            ...descriptor.compute,
            module: getGPUShaderModule(device, descriptor.compute.code),
        },
    });
    computePipelineMap.set(descriptor, pipeline);

    return pipeline;
}

