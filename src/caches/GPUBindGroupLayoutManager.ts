import { ChainMap } from '@feng3d/render-api';
import { BindGroupLayoutDescriptor } from './GPUPipelineLayoutManager';

export class GPUBindGroupLayoutManager
{
    static getGPUBindGroupLayout(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor)
    {
        const key = [device, bindGroupLayout];
        let gpuBindGroupLayout = this._gpuBindGroupLayoutMap.get(key);

        if (gpuBindGroupLayout) return gpuBindGroupLayout;

        gpuBindGroupLayout = device.createBindGroupLayout(bindGroupLayout);
        this._gpuBindGroupLayoutMap.set(key, gpuBindGroupLayout);

        return gpuBindGroupLayout;
    }

    private static readonly _gpuBindGroupLayoutMap = new ChainMap<any[], GPUBindGroupLayout>();
}
