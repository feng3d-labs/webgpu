import { IGPUBindGroupLayout, IGPUBindGroupLayoutDescriptor, IGPUBindGroupLayoutFromPipeline } from "../data/IGPUBindGroup";
import { IGPUComputePipeline } from "../data/IGPUComputeObject";
import { IGPURenderPipeline } from "../data/IGPURenderObject";
import { getGPUComputePipeline } from "./getGPUComputePipeline";
import { getGPURenderPipeline } from "./getGPURenderPipeline";

export function getGPUBindGroupLayout(device: GPUDevice, layout: IGPUBindGroupLayout)
{
    let gpuBindGroupLayout = bindGroupLayoutMap.get(layout);

    if (gpuBindGroupLayout) return gpuBindGroupLayout;

    if ((layout as IGPUBindGroupLayoutFromPipeline).pipeline)
    {
        layout = layout as IGPUBindGroupLayoutFromPipeline;
        let pipeline: GPUPipelineBase;
        if ((layout.pipeline as IGPURenderPipeline).vertex)
        {
            const iGPURenderPipeline = layout.pipeline as IGPURenderPipeline;
            pipeline = getGPURenderPipeline(device, iGPURenderPipeline);
        }
        else
        {
            const iGPUComputePipeline = layout.pipeline as IGPUComputePipeline;
            pipeline = getGPUComputePipeline(device, iGPUComputePipeline);
        }

        gpuBindGroupLayout = pipeline.getBindGroupLayout(layout.index);
        bindGroupLayoutMap.set(layout, gpuBindGroupLayout);

        return gpuBindGroupLayout;
    }

    //
    layout = layout as IGPUBindGroupLayoutDescriptor;
    const entries: GPUBindGroupLayoutEntry[] = layout.entries.map((v) =>
    {
        const visibility = v.visibility.reduce((pv, cv) =>
        {
            pv = pv | GPUShaderStage[cv];

            return pv;
        }, 0);

        const entity: GPUBindGroupLayoutEntry = {
            ...v,
            visibility,
        };

        return entity;
    });

    gpuBindGroupLayout = device.createBindGroupLayout({
        entries,
    });

    bindGroupLayoutMap.set(layout, gpuBindGroupLayout);

    return gpuBindGroupLayout;
}

const bindGroupLayoutMap = new WeakMap<IGPUBindGroupLayout, GPUBindGroupLayout>();
