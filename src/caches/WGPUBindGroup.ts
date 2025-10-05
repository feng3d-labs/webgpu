import { reactive } from '@feng3d/reactivity';
import { BindingResources, BufferBinding, ChainMap, Sampler, TextureView } from '@feng3d/render-api';
import { ResourceType } from 'wgsl_reflect';

import { VideoTexture } from '../data/VideoTexture';
import { ReactiveObject } from '../ReactiveObject';
import { ExternalSampledTextureType } from '../types/TextureType';
import { WGPUBindGroupLayout } from './WGPUBindGroupLayout';
import { WGPUBufferBinding } from './WGPUBufferBinding';
import { WGPUExternalTexture } from './WGPUExternalTexture';
import { BindGroupLayoutDescriptor } from './WGPUPipelineLayout';
import { WGPUSampler } from './WGPUSampler';
import { WGPUTextureView } from './WGPUTextureView';

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
        const r_bindingResources = reactive(bindingResources);

        const numberBufferBinding: { [name: string]: number[] } = {};

        this.effect(() =>
        {
            const entries = bindGroupLayout.entries.map((v) =>
            {
                const { name, type, resourceType, binding } = v.variableInfo;

                // 监听
                r_bindingResources[name];

                // 执行
                const entry: GPUBindGroupEntry = { binding, resource: null };

                //
                if (resourceType === ResourceType.Uniform || resourceType === ResourceType.Storage)
                {
                    // 执行
                    let resource = bindingResources[name];

                    // 当值为number时，将其视为一个数组。
                    if (typeof resource === 'number')
                    {
                        numberBufferBinding[name] ??= [];
                        numberBufferBinding[name][0] = resource;
                        resource = numberBufferBinding[name];
                    }
                    const bufferBinding = resource as BufferBinding; // 值为number且不断改变时将可能会产生无数细碎gpu缓冲区。

                    const wgpuBufferBinding = WGPUBufferBinding.getInstance(device, bufferBinding, type);
                    reactive(wgpuBufferBinding).gpuBufferBinding;
                    entry.resource = wgpuBufferBinding.gpuBufferBinding;
                }
                else if (ExternalSampledTextureType[type.name]) // 判断是否为外部纹理
                {
                    const wgpuExternalTexture = WGPUExternalTexture.getInstance(device, bindingResources[name] as VideoTexture);
                    reactive(wgpuExternalTexture).gpuExternalTexture;
                    entry.resource = wgpuExternalTexture.gpuExternalTexture;
                }
                else if (resourceType === ResourceType.Texture || resourceType === ResourceType.StorageTexture)
                {
                    const wgpuTextureView = WGPUTextureView.getInstance(device, bindingResources[name] as TextureView);
                    reactive(wgpuTextureView).textureView;
                    entry.resource = wgpuTextureView.textureView;
                }
                else
                {
                    const wgpuSampler = WGPUSampler.getInstance(device, bindingResources[name] as Sampler);
                    reactive(wgpuSampler).gpuSampler;
                    entry.resource = wgpuSampler.gpuSampler;
                }

                return entry;
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