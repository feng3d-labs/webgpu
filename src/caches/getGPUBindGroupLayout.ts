import { IGPUBindGroupLayoutDescriptor } from "../data/IGPUBindGroup";

export function getGPUBindGroupLayout(device: GPUDevice, layout: IGPUBindGroupLayoutDescriptor)
{
    let gpuBindGroupLayout = bindGroupLayoutMap.get(layout);

    if (gpuBindGroupLayout) return gpuBindGroupLayout;

    //
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

const bindGroupLayoutMap = new WeakMap<IGPUBindGroupLayoutDescriptor, GPUBindGroupLayout>();
