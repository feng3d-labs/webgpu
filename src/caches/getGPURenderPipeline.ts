import { IGPURenderPipeline } from "../data/IGPURenderObject";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";

export function getGPURenderPipeline(device: GPUDevice, descriptor: IGPURenderPipeline)
{
    let pipeline = pipelineMap.get(descriptor);
    if (pipeline) return pipeline;

    // 从GPU管线中获取管线布局。
    const gpuPipelineLayout = getIGPUPipelineLayout(descriptor);
    const layout = getGPUPipelineLayout(device, gpuPipelineLayout);

    const gpuRenderPipelineDescriptor: GPURenderPipelineDescriptor = {
        layout,
        vertex: {
            ...descriptor.vertex,
            module: getGPUShaderModule(device, descriptor.vertex.code),
        },
        primitive: descriptor.primitive,
        depthStencil: descriptor.depthStencil as any,
        multisample: descriptor.multisample,
    };

    if (descriptor.fragment)
    {
        gpuRenderPipelineDescriptor.fragment = {
            ...descriptor.fragment as any,
            module: getGPUShaderModule(device, descriptor.fragment.code),
        };
    }

    pipeline = device.createRenderPipeline(gpuRenderPipelineDescriptor);

    pipelineMap.set(descriptor, pipeline);

    return pipeline;
}

const pipelineMap = new Map<IGPURenderPipeline, GPURenderPipeline>();
