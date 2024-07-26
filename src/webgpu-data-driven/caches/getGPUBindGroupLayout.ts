import { IGPUBindGroupLayout, IGPUBindGroupLayoutFromPipeline } from '../data/IGPUBindGroup';
import { getGPUComputePipeline } from './getGPUComputePipeline';
import { getGPURenderPipeline, isRenderPipeline } from './getGPURenderPipeline';

export function getGPUBindGroupLayout(device: GPUDevice, layout: IGPUBindGroupLayout)
{
    let gpuBindGroupLayout = bindGroupLayoutMap.get(layout);

    if (gpuBindGroupLayout) return gpuBindGroupLayout;

    if (isBindGroupLayoutFromPipeline(layout))
    {
        let pipeline: GPUPipelineBase;
        if (isRenderPipeline(layout.pipeline))
        {
            pipeline = getGPURenderPipeline(device, layout.pipeline);
        }
        else
        {
            pipeline = getGPUComputePipeline(device, layout.pipeline);
        }

        gpuBindGroupLayout = pipeline.getBindGroupLayout(layout.index);
        bindGroupLayoutMap.set(layout, gpuBindGroupLayout);

        return gpuBindGroupLayout;
    }

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

function isBindGroupLayoutFromPipeline(layout: IGPUBindGroupLayout): layout is IGPUBindGroupLayoutFromPipeline
{
    return !!(layout as IGPUBindGroupLayoutFromPipeline).pipeline;
}
