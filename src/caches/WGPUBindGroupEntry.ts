import { reactive } from '@feng3d/reactivity';
import { BindingResources, BufferBinding, ChainMap, Sampler, TextureView } from '@feng3d/render-api';
import { ResourceType } from 'wgsl_reflect';
import { VideoTexture } from '../data/VideoTexture';
import { ReactiveObject } from '../ReactiveObject';
import { ExternalSampledTextureType } from '../types/TextureType';
import { WGPUBufferBinding } from './WGPUBufferBinding';
import { WGPUExternalTexture } from './WGPUExternalTexture';
import { WGPUSampler } from './WGPUSampler';
import { WGPUTextureView } from './WGPUTextureView';

export class WGPUBindGroupEntry extends ReactiveObject
{
    readonly gpuBindGroupEntry: GPUBindGroupEntry;

    constructor(device: GPUDevice, bindGroupLayout: GPUBindGroupLayoutEntry, bindingResources: BindingResources)
    {
        super();

        this._onCreate(device, bindGroupLayout, bindingResources);
        this._onMap(device, bindGroupLayout, bindingResources);
    }

    private _onCreate(device: GPUDevice, v: GPUBindGroupLayoutEntry, bindingResources: BindingResources)
    {
        const r_this = reactive(this);
        const r_bindingResources = reactive(bindingResources);

        const { name, type, resourceType, binding } = v.variableInfo;

        const numberBufferBinding = [0];

        this.effect(() =>
        {

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
                    numberBufferBinding[0] = resource;
                    resource = numberBufferBinding;
                }
                const bufferBinding = resource as BufferBinding; // 值为number且不断改变时将可能会产生无数细碎gpu缓冲区。

                //
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

            r_this.gpuBindGroupEntry = entry;
        });

        this.destroyCall(() => { r_this.gpuBindGroupEntry = null; });
    }

    private _onMap(device: GPUDevice, bindGroupLayout: GPUBindGroupLayoutEntry, bindingResources: BindingResources)
    {
        device.bindGroupEntrys ??= new ChainMap();
        device.bindGroupEntrys.set([bindGroupLayout, bindingResources], this);
        this.destroyCall(() => { device.bindGroupEntrys.delete([bindGroupLayout, bindingResources]); });
    }

    static getInstance(device: GPUDevice, bindGroupLayout: GPUBindGroupLayoutEntry, bindingResources: BindingResources)
    {
        return device.bindGroupEntrys?.get([bindGroupLayout, bindingResources]) || new WGPUBindGroupEntry(device, bindGroupLayout, bindingResources);
    }
}

declare global
{
    interface GPUDevice
    {
        bindGroupEntrys: ChainMap<[GPUBindGroupLayoutEntry, BindingResources], WGPUBindGroupEntry>;
    }
}