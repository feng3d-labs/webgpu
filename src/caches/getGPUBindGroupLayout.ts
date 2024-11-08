
export function getGPUBindGroupLayout(device: GPUDevice, layout: GPUBindGroupLayoutDescriptor)
{
    let gpuBindGroupLayout = bindGroupLayoutMap.get(layout);

    if (gpuBindGroupLayout) return gpuBindGroupLayout;

    //
    gpuBindGroupLayout = device.createBindGroupLayout({
        entries: layout.entries,
    });

    bindGroupLayoutMap.set(layout, gpuBindGroupLayout);

    return gpuBindGroupLayout;
}

const bindGroupLayoutMap = new WeakMap<GPUBindGroupLayoutDescriptor, GPUBindGroupLayout>();
