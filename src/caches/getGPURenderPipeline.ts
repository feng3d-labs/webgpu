import { NRenderPipeline } from "../internal/NRenderPipeline";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";

export function getGPURenderPipeline(device: GPUDevice, renderPipeline: NRenderPipeline)
{
    let pipeline = device._pipelineMap.get(renderPipeline);
    if (pipeline) return pipeline;

    // 从GPU管线中获取管线布局。
    const layout = getGPUPipelineLayout(device, { vertex: renderPipeline.vertex.code, fragment: renderPipeline.fragment?.code });

    const gpuRenderPipelineDescriptor: GPURenderPipelineDescriptor = {
        layout,
        vertex: {
            ...renderPipeline.vertex,
            module: getGPUShaderModule(device, renderPipeline.vertex.code),
        },
        primitive: renderPipeline.primitive,
        depthStencil: renderPipeline.depthStencil,
        multisample: renderPipeline.multisample,
    };

    if (renderPipeline.fragment)
    {
        gpuRenderPipelineDescriptor.fragment = {
            ...renderPipeline.fragment,
            module: getGPUShaderModule(device, renderPipeline.fragment.code),
        };
    }

    pipeline = device.createRenderPipeline(gpuRenderPipelineDescriptor);

    device._pipelineMap.set(renderPipeline, pipeline);

    return pipeline;
}

