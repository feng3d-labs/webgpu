import { computed, Computed, reactive } from '@feng3d/reactivity';
import { BindingResources, BufferBinding, ChainMap, Sampler, Texture, TextureView } from '@feng3d/render-api';
import { ResourceType } from 'wgsl_reflect';
import { VideoTexture } from '../data/VideoTexture';
import { ReactiveObject } from '../ReactiveObject';
import { ExternalSampledTextureType } from '../types/TextureType';
import { WGPUBufferBinding } from './WGPUBufferBinding';
import { WGPUExternalTexture } from './WGPUExternalTexture';
import { WGPUSampler } from './WGPUSampler';
import { WGPUTextureView } from './WGPUTextureView';

/**
 * 检查对象是否是包含 texture 和 sampler 的纹理对象
 */
function isTextureSamplerObject(value: any): value is { texture: Texture; sampler: Sampler }
{
    return value && typeof value === 'object' && 'texture' in value && 'sampler' in value;
}

export class WGPUBindGroupEntry extends ReactiveObject
{
    get gpuBindGroupEntry() { return this._computedGpuBindGroupEntry.value; }
    private _computedGpuBindGroupEntry: Computed<GPUBindGroupEntry>;

    constructor(device: GPUDevice, bindGroupLayout: GPUBindGroupLayoutEntry, bindingResources: BindingResources)
    {
        super();

        this._onCreate(device, bindGroupLayout, bindingResources);
        //
        WGPUBindGroupEntry.map.set([device, bindGroupLayout, bindingResources], this);
        this.destroyCall(() => { WGPUBindGroupEntry.map.delete([device, bindGroupLayout, bindingResources]); });
    }

    private _onCreate(device: GPUDevice, v: GPUBindGroupLayoutEntry, bindingResources: BindingResources)
    {
        const r_bindingResources = reactive(bindingResources);

        const { name, type, resourceType, binding } = v.variableInfo;

        this._computedGpuBindGroupEntry = computed(() =>
        {
            // 监听当前名称
            r_bindingResources[name];

            // 如果变量名以 _texture 结尾，也需要监听基础名称（如 uSampler_texture -> uSampler）
            // 这样当基础名称变化时，也能触发响应式更新
            if (name.endsWith('_texture'))
            {
                const baseName = name.replace(/_texture$/, ''); // 移除 '_texture' 后缀
                r_bindingResources[baseName];
            }

            // 执行
            const entry: GPUBindGroupEntry = { binding, resource: null };

            //
            if (resourceType === ResourceType.Uniform || resourceType === ResourceType.Storage)
            {
                // 执行
                const bufferBinding = bindingResources[name] as BufferBinding;

                //
                const wgpuBufferBinding = WGPUBufferBinding.getInstance(device, bufferBinding, type);
                entry.resource = wgpuBufferBinding.gpuBufferBinding;
            }
            else if (ExternalSampledTextureType[type.name]) // 判断是否为外部纹理
            {
                const wgpuExternalTexture = WGPUExternalTexture.getInstance(device, bindingResources[name] as VideoTexture);
                entry.resource = wgpuExternalTexture.gpuExternalTexture;
            }
            else if (resourceType === ResourceType.Texture || resourceType === ResourceType.StorageTexture)
            {
                let textureView: TextureView | undefined;

                // 如果变量名以 _texture 结尾，说明是展开格式（如 uSampler_texture）
                if (name.endsWith('_texture'))
                {
                    // 先尝试直接获取展开格式
                    textureView = bindingResources[name] as TextureView | undefined;

                    // 如果没有找到，尝试从基础名称中提取（如 uSampler_texture -> uSampler）
                    if (!textureView)
                    {
                        const baseName = name.replace(/_texture$/, ''); // 移除 '_texture' 后缀
                        const value = bindingResources[baseName];
                        if (isTextureSamplerObject(value))
                        {
                            textureView = { texture: value.texture } as TextureView;
                        }
                    }
                }
                else
                {
                    // 检查是否是 texture+sampler 对象（如 { uSampler: { texture, sampler } }）
                    const value = bindingResources[name];
                    if (isTextureSamplerObject(value))
                    {
                        textureView = { texture: value.texture } as TextureView;
                    }
                    else
                    {
                        textureView = bindingResources[name] as TextureView | undefined;
                    }
                }

                if (!textureView)
                {
                    throw new Error(`Texture binding '${name}' is undefined in bindingResources`);
                }

                const wgpuTextureView = WGPUTextureView.getInstance(device, textureView);
                entry.resource = wgpuTextureView.textureView;
            }
            else
            {
                // 检查是否是 texture+sampler 对象
                let sampler: Sampler;
                const value = bindingResources[name];
                if (!value)
                {
                    throw new Error(`Sampler binding '${name}' is undefined in bindingResources`);
                }

                if (isTextureSamplerObject(value))
                {
                    // 从 texture+sampler 对象中提取 sampler
                    sampler = value.sampler;
                }
                else
                {
                    sampler = value as Sampler;
                }

                const wgpuSampler = WGPUSampler.getInstance(device, sampler);
                entry.resource = wgpuSampler.gpuSampler;
            }

            return entry;
        });

        this.destroyCall(() => { this._computedGpuBindGroupEntry = null; });
    }

    static getInstance(device: GPUDevice, bindGroupLayout: GPUBindGroupLayoutEntry, bindingResources: BindingResources)
    {
        return this.map.get([device, bindGroupLayout, bindingResources]) || new WGPUBindGroupEntry(device, bindGroupLayout, bindingResources);
    }

    private static readonly map = new ChainMap<[GPUDevice, GPUBindGroupLayoutEntry, BindingResources], WGPUBindGroupEntry>();
}
