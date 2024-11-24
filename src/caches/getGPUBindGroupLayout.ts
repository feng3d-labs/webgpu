
export function getGPUBindGroupLayout(device: GPUDevice, layout: GPUBindGroupLayoutDescriptor)
{
    let gpuBindGroupLayout = bindGroupLayoutMap.get(layout);

    if (gpuBindGroupLayout) return gpuBindGroupLayout;

    // 排除 undefined 元素。
    const entries = layout.entries as GPUBindGroupLayoutEntry[];
    for (let i = entries.length - 1; i >= 0; i--)
    {
        if (!entries[i])
        {
            entries.splice(i, 1);
        }
    }

    //
    gpuBindGroupLayout = device.createBindGroupLayout(layout);

    bindGroupLayoutMap.set(layout, gpuBindGroupLayout);

    return gpuBindGroupLayout;
}

const bindGroupLayoutMap = new WeakMap<GPUBindGroupLayoutDescriptor, GPUBindGroupLayout>();
