import { ChainMap } from '@feng3d/render-api';
import { BindGroupLayoutDescriptor } from './GPUPipelineLayoutManager';

export class WGPUBindGroupLayout
{
    static getInstance(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor)
    {
        let result = this._gpuBindGroupLayoutMap.get([device, bindGroupLayout]);

        if (result) return result;

        result = new WGPUBindGroupLayout(device, bindGroupLayout);

        this._gpuBindGroupLayoutMap.set([device, bindGroupLayout], result);

        return result;
    }

    private static readonly _gpuBindGroupLayoutMap = new ChainMap<any[], WGPUBindGroupLayout>();

    gpuBindGroupLayout: GPUBindGroupLayout;

    constructor(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor)
    {
        this.gpuBindGroupLayout = device.createBindGroupLayout(bindGroupLayout);
    }
}
