import { NRenderPipeline } from "../internal/NRenderPipeline";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";

export function getGPURenderPipeline(device: GPUDevice, renderPipeline: NRenderPipeline)
{
    let pipeline = pipelineMap.get(renderPipeline);
    if (pipeline) return pipeline;

    // 从GPU管线中获取管线布局。
    const gpuPipelineLayout = getIGPUPipelineLayout({ vertex: renderPipeline.vertex.code, fragment: renderPipeline.fragment?.code });
    const layout = getGPUPipelineLayout(device, gpuPipelineLayout);

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

    pipelineMap.set(renderPipeline, pipeline);

    return pipeline;
}

const pipelineMap = new Map<NRenderPipeline, GPURenderPipeline>();
