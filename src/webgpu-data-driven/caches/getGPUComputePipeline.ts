import { IGPUComputePipeline } from "../data/IGPUComputeObject";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";

export function getGPUComputePipeline(device: GPUDevice, descriptor: IGPUComputePipeline)
{
    let pipeline = computePipelineMap.get(descriptor);
    if (pipeline) return pipeline;

    let layout: "auto" | GPUPipelineLayout = "auto";

    if (descriptor.layout && descriptor.layout !== "auto")
    {
        layout = getGPUPipelineLayout(device, descriptor.layout);
    }

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

const computePipelineMap = new WeakMap<IGPUComputePipeline, GPUComputePipeline>();
