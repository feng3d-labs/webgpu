import { reactive } from '@feng3d/reactivity';
import { BindingResources, ChainMap } from '@feng3d/render-api';

import { ReactiveObject } from '../ReactiveObject';
import { WGPUBindGroupEntry } from './WGPUBindGroupEntry';
import { WGPUBindGroupLayout } from './WGPUBindGroupLayout';
import { BindGroupLayoutDescriptor } from './WGPUPipelineLayout';

export class WGPUBindGroup extends ReactiveObject
{
    readonly gpuBindGroup: GPUBindGroup

    constructor(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: BindingResources)
    {
        super();

        this._onCreate(device, bindGroupLayout, bindingResources);
        this._onMap(device, bindGroupLayout, bindingResources);
    }

    private _onCreate(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: BindingResources)
    {
        const r_this = reactive(this);

        this.effect(() =>
        {
            const entries = bindGroupLayout.entries.map((v) =>
            {
                const wgpuBindGroupEntry = WGPUBindGroupEntry.getInstance(device, v, bindingResources);
                reactive(wgpuBindGroupEntry).gpuBindGroupEntry;

                return wgpuBindGroupEntry.gpuBindGroupEntry;
            });

            //
            const resources = entries.map((v) => v.resource);
            const gpuBindGroupKey: GPUBindGroupKey = [bindGroupLayout, ...resources];
            let gBindGroup = WGPUBindGroup.gpuBindGroupMap.get(gpuBindGroupKey);

            if (!gBindGroup)
            {
                const gpuBindGroupLayout = WGPUBindGroupLayout.getGPUBindGroupLayout(device, bindGroupLayout);

                gBindGroup = device.createBindGroup({ layout: gpuBindGroupLayout, entries });

                WGPUBindGroup.gpuBindGroupMap.set(gpuBindGroupKey, gBindGroup);
            }

            r_this.gpuBindGroup = gBindGroup;
        });
    }

    private _onMap(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: BindingResources)
    {
        device.bindGroups ??= new ChainMap();
        device.bindGroups.set([bindGroupLayout, bindingResources], this);
        this.destroyCall(() => { device.bindGroups.delete([bindGroupLayout, bindingResources]); });
    }

    static getInstance(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: BindingResources)
    {
        return device.bindGroups?.get([bindGroupLayout, bindingResources]) || new WGPUBindGroup(device, bindGroupLayout, bindingResources);
    }

    private static readonly gpuBindGroupMap = new ChainMap<GPUBindGroupKey, GPUBindGroup>();
}

type GPUBindGroupKey = [bindGroupLayout: BindGroupLayoutDescriptor, ...resources: GPUBindingResource[]];

declare global
{
    interface GPUDevice
    {
        bindGroups: ChainMap<[bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: BindingResources], WGPUBindGroup>;
    }
}