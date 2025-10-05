import { computed, Computed, effect, reactive, UnReadonly } from '@feng3d/reactivity';
import { BindingResources, Buffer, BufferBinding, BufferBindingInfo, ChainMap, Sampler, TextureView } from '@feng3d/render-api';
import { ArrayInfo, ResourceType, StructInfo, TemplateInfo, TypeInfo } from 'wgsl_reflect';

import { VideoTexture } from '../data/VideoTexture';
import { ReactiveObject } from '../ReactiveObject';
import { ExternalSampledTextureType } from '../types/TextureType';
import { WGPUBindGroupLayout } from './WGPUBindGroupLayout';
import { WGPUBuffer } from './WGPUBuffer';
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

        const numberBufferBinding: { [name: string]: number[] } = {};

        this.effect(() =>
        {
            const entries = bindGroupLayout.entries.map((v) =>
            {
                const { name, type, resourceType, binding } = v.variableInfo;

                // 监听
                const r_bindingResources = reactive(bindingResources);

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

                    entry.resource = WGPUBindGroup.getGPUBufferBinding(device, bufferBinding, type);
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

    private static getGPUBufferBinding(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        const getGPUBindingResourceKey: GetGPUBindingResourceKey = [device, bufferBinding, type];
        let result = WGPUBindGroup.getGPUBindingResourceMap.get(getGPUBindingResourceKey);

        if (result) return result.value;

        result = computed(() =>
        {
            // 监听
            const r_bufferBinding = reactive(bufferBinding);

            r_bufferBinding?.bufferView;

            // 更新缓冲区绑定的数据。
            WGPUBindGroup.updateBufferBinding(bufferBinding, type);
            const bufferView = bufferBinding.bufferView;
            //
            const gbuffer = Buffer.fromArrayBuffer(bufferView.buffer);

            (gbuffer as any).label = gbuffer.label || (`BufferBinding ${type.name}`);
            //
            const buffer = WGPUBuffer.getInstance(device, gbuffer).gpuBuffer;

            const offset = bufferView.byteOffset;
            const size = bufferView.byteLength;

            const gpuBufferBinding: GPUBufferBinding = {
                buffer,
                offset,
                size,
            };
            const gpuBufferBindingKey: GPUBufferBindingKey = [buffer, offset, size];
            const cache = WGPUBindGroup.gpuBufferBindingMap.get(gpuBufferBindingKey);

            if (cache) return cache;
            WGPUBindGroup.gpuBufferBindingMap.set(gpuBufferBindingKey, gpuBufferBinding);

            return gpuBufferBinding;
        });

        WGPUBindGroup.getGPUBindingResourceMap.set(getGPUBindingResourceKey, result);

        return result.value;
    }

    /**
     * 初始化缓冲区绑定。
     *
     * @param variableInfo
     * @param uniformData
     * @returns
     */
    private static updateBufferBinding(uniformData: BufferBinding, type: TypeInfo)
    {
        const bufferBindingInfo = WGPUBindGroup.getBufferBindingInfo(type);

        const size = bufferBindingInfo.size;
        // 是否存在默认值。
        const hasDefautValue = !!uniformData.bufferView;

        if (!hasDefautValue)
        {
            (uniformData as UnReadonly<BufferBinding>).bufferView = new Uint8Array(size);
        }

        const buffer = Buffer.fromArrayBuffer(uniformData.bufferView.buffer);
        const offset = uniformData.bufferView.byteOffset;

        for (let i = 0; i < bufferBindingInfo.items.length; i++)
        {
            const { paths, offset: itemInfoOffset, size: itemInfoSize, Cls } = bufferBindingInfo.items[i];

            // 更新数据
            effect(() =>
            {
                let value: any = uniformData;
                let r_value: any = reactive(uniformData); // 监听

                for (let i = 0; i < paths.length; i++)
                {
                    value = value[paths[i]];
                    r_value = r_value[paths[i]]; // 监听
                    if (value === undefined)
                    {
                        if (!hasDefautValue)
                        {
                            console.warn(`没有找到 统一块变量属性 ${paths.join('.')} 的值！`);
                        }

                        return;
                    }
                }

                // 更新数据
                let data: Float32Array | Int32Array | Uint32Array | Int16Array;

                if (typeof value === 'number')
                {
                    data = new Cls([value]);
                }
                else if (value.constructor.name !== Cls.name)
                {
                    data = new Cls(value as ArrayLike<number>);
                }
                else
                {
                    data = value as any;
                }

                const writeBuffers = buffer.writeBuffers ?? [];

                writeBuffers.push({ bufferOffset: offset + itemInfoOffset, data: data.buffer, dataOffset: data.byteOffset, size: Math.min(itemInfoSize, data.byteLength) });
                reactive(buffer).writeBuffers = writeBuffers;
            });
        }
    }

    /**
     * 获取缓冲区绑定信息。
     *
     * @param type 类型信息。
     * @returns
     */
    private static getBufferBindingInfo(type: TypeInfo)
    {
        let result = WGPUBindGroup.bufferBindingInfoMap.get(type);

        if (result) return result;
        result = WGPUBindGroup._getBufferBindingInfo(type);

        WGPUBindGroup.bufferBindingInfoMap.set(type, result);

        return result;
    }

    /**
     * 获取缓冲区绑定信息。
     *
     * @param type 类型信息。
     * @param paths 当前路径。
     * @param offset 当前编译。
     * @param bufferBindingInfo 缓冲区绑定信息。
     * @returns
     */
    private static _getBufferBindingInfo(type: TypeInfo, paths: string[] = [], offset = 0, bufferBindingInfo: BufferBindingInfo = { size: type.size, items: [] })
    {
        if (type.isStruct)
        {
            const structInfo = type as StructInfo;

            for (let i = 0; i < structInfo.members.length; i++)
            {
                const memberInfo = structInfo.members[i];

                WGPUBindGroup._getBufferBindingInfo(memberInfo.type, paths.concat(memberInfo.name), offset + memberInfo.offset, bufferBindingInfo);
            }
        }
        else if (type.isArray)
        {
            const arrayInfo = type as ArrayInfo;

            for (let i = 0; i < arrayInfo.count; i++)
            {
                WGPUBindGroup._getBufferBindingInfo(arrayInfo.format, paths.concat(`${i}`), offset + i * arrayInfo.format.size, bufferBindingInfo);
            }
        }
        else if (type.isTemplate)
        {
            const templateInfo = type as TemplateInfo;
            const templateFormatName = templateInfo.format?.name;

            bufferBindingInfo.items.push({
                paths: paths.concat(),
                offset,
                size: templateInfo.size,
                Cls: WGPUBindGroup.getTemplateDataCls(templateFormatName as any),
            });
        }
        else
        {
            bufferBindingInfo.items.push({
                paths: paths.concat(),
                offset,
                size: type.size,
                Cls: WGPUBindGroup.getBaseTypeDataCls(type.name),
            });
        }

        return bufferBindingInfo;
    }

    private static getBaseTypeDataCls(baseTypeName: string)
    {
        const dataCls = WGPUBindGroup.baseTypeDataCls[baseTypeName];

        console.assert(!!dataCls, `baseTypeName必须为以下值 ${Object.keys(WGPUBindGroup.baseTypeDataCls)}`);

        return dataCls;
    }

    /**
     * @see https://gpuweb.github.io/gpuweb/wgsl/#vec2i
     */
    private static readonly baseTypeDataCls: { [key: string]: DataCls } = {
        i32: Int32Array,
        u32: Uint32Array,
        f32: Float32Array,
        f16: Int16Array,
        vec2i: Int32Array,
        vec3i: Int32Array,
        vec4i: Int32Array,
        vec2u: Uint32Array,
        vec3u: Uint32Array,
        vec4u: Uint32Array,
        vec2f: Float32Array,
        vec3f: Float32Array,
        vec4f: Float32Array,
        vec2h: Int16Array,
        vec3h: Int16Array,
        vec4h: Int16Array,
        mat2x2f: Float32Array,
        mat2x3f: Float32Array,
        mat2x4f: Float32Array,
        mat3x2f: Float32Array,
        mat3x3f: Float32Array,
        mat3x4f: Float32Array,
        mat4x2f: Float32Array,
        mat4x3f: Float32Array,
        mat4x4f: Float32Array,
        mat2x2h: Float32Array,
        mat2x3h: Float32Array,
        mat2x4h: Float32Array,
        mat3x2h: Float32Array,
        mat3x3h: Float32Array,
        mat3x4h: Float32Array,
        mat4x2h: Float32Array,
        mat4x3h: Float32Array,
        mat4x4h: Float32Array,
    };

    private static getTemplateDataCls(templateFormatName: 'i32' | 'u32' | 'f32' | 'f16')
    {
        const dataCls = WGPUBindGroup.templateFormatDataCls[templateFormatName];

        console.assert(!!dataCls, `templateFormatName必须为以下值 ${Object.keys(WGPUBindGroup.templateFormatDataCls)}`);

        return dataCls;
    }

    private static readonly templateFormatDataCls: { [key: string]: DataCls } = {
        i32: Int32Array,
        u32: Uint32Array,
        f32: Float32Array,
        f16: Int16Array,
    };

    private static readonly getGPUBindGroupMap = new ChainMap<GetGPUBindGroupKey, Computed<GPUBindGroup>>();
    private static readonly gpuBindGroupMap = new ChainMap<GPUBindGroupKey, GPUBindGroup>();
    private static readonly gpuBufferBindingMap = new ChainMap<GPUBufferBindingKey, GPUBufferBinding>();
    private static readonly getGPUBindingResourceMap = new ChainMap<GetGPUBindingResourceKey, Computed<GPUBufferBinding>>();
    private static readonly getGPUExternalTextureMap = new ChainMap<GetGPUExternalTextureKey, Computed<GPUExternalTexture>>();
    private static readonly bufferBindingInfoMap = new Map<TypeInfo, BufferBindingInfo>();
}

type GPUBindGroupKey = [bindGroupLayout: BindGroupLayoutDescriptor, ...resources: GPUBindingResource[]];
type GetGPUBindGroupKey = [bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: BindingResources];
type GPUBufferBindingKey = [buffer: GPUBuffer, offset: number, size: number];
type GetGPUBindingResourceKey = [device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo];
type GetGPUExternalTextureKey = [device: GPUDevice, videoTexture: VideoTexture];
type DataCls = Float32ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Int16ArrayConstructor;

declare global
{
    interface GPUDevice
    {
        bindGroups: ChainMap<[bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: BindingResources], WGPUBindGroup>;
    }
}