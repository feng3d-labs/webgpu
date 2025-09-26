import { BindGroupLayoutDescriptor } from './GPUPipelineLayoutManager';

export class WGPUBindGroupLayout
{
    static getGPUBindGroupLayout(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor)
    {
        let gpuBindGroupLayout = device.bindGroupLayouts?.get(bindGroupLayout);

        if (!gpuBindGroupLayout)
        {
            device.bindGroupLayouts ??= new WeakMap();

            gpuBindGroupLayout = device.createBindGroupLayout(bindGroupLayout);

            device.bindGroupLayouts.set(bindGroupLayout, gpuBindGroupLayout);
        }

        return gpuBindGroupLayout;
    }
}

declare global
{
    interface GPUDevice
    {
        bindGroupLayouts: WeakMap<BindGroupLayoutDescriptor, GPUBindGroupLayout>;
    }
}