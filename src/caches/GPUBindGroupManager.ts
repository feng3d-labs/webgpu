import { computed, Computed, effect, reactive, UnReadonly } from '@feng3d/reactivity';
import { BindingResources, BufferBinding, BufferBindingInfo, ChainMap, Sampler, TextureView } from '@feng3d/render-api';
import { ArrayInfo, ResourceType, StructInfo, TemplateInfo, TypeInfo } from 'wgsl_reflect';

import { VideoTexture } from '../data/VideoTexture';
import { webgpuEvents } from '../eventnames';
import { ExternalSampledTextureType } from '../types/TextureType';
import { GPUBindGroupLayoutManager } from './GPUBindGroupLayoutManager';
import { GPUBufferManager } from './GPUBufferManager';
import { BindGroupLayoutDescriptor } from './GPUPipelineLayoutManager';
import { GPUSamplerManager } from './GPUSamplerManager';
import { GPUTextureViewManager } from './GPUTextureViewManager';

export class GPUBindGroupManager
{
    static getGPUBindGroup(device: GPUDevice, bindGroupLayout: BindGroupLayoutDescriptor, bindingResources: BindingResources)
    {
        const getGPUBindGroupKey: GetGPUBindGroupKey = [bindGroupLayout, bindingResources];
        let result = GPUBindGroupManager.getGPUBindGroupMap.get(getGPUBindGroupKey);

        if (result) return result.value;

        let gBindGroup: GPUBindGroup;
        const numberBufferBinding: { [name: string]: number[] } = {};

        result = computed(() =>
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

                    entry.resource = GPUBindGroupManager.getGPUBufferBinding(device, bufferBinding, type);
                }
                else if (ExternalSampledTextureType[type.name]) // 判断是否为外部纹理
                {
                    entry.resource = GPUBindGroupManager.getGPUExternalTexture(device, bindingResources[name] as VideoTexture);
                }
                else if (resourceType === ResourceType.Texture || resourceType === ResourceType.StorageTexture)
                {
                    entry.resource = GPUTextureViewManager.getGPUTextureView(device, bindingResources[name] as TextureView);
                }
                else
                {
                    entry.resource = GPUSamplerManager.getGPUSampler(device, bindingResources[name] as Sampler);
                }

                return entry;
            });

            //
            const resources = entries.map((v) => v.resource);
            const gpuBindGroupKey: GPUBindGroupKey = [bindGroupLayout, ...resources];
            const cache = GPUBindGroupManager.gpuBindGroupMap.get(gpuBindGroupKey);

            if (cache) return cache;

            const gpuBindGroupLayout = GPUBindGroupLayoutManager.getGPUBindGroupLayout(device, bindGroupLayout);

            gBindGroup = device.createBindGroup({ layout: gpuBindGroupLayout, entries });

            GPUBindGroupManager.gpuBindGroupMap.set(gpuBindGroupKey, gBindGroup);

            return gBindGroup;
        });
        GPUBindGroupManager.getGPUBindGroupMap.set(getGPUBindGroupKey, result);

        return result.value;
    }

    private static getGPUBufferBinding(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        const getGPUBindingResourceKey: GetGPUBindingResourceKey = [device, bufferBinding, type];
        let result = GPUBindGroupManager.getGPUBindingResourceMap.get(getGPUBindingResourceKey);

        if (result) return result.value;

        result = computed(() =>
        {
            // 监听
            const r_bufferBinding = reactive(bufferBinding);

            r_bufferBinding?.bufferView;

            // 更新缓冲区绑定的数据。
            GPUBindGroupManager.updateBufferBinding(bufferBinding, type);
            const bufferView = bufferBinding.bufferView;
            //
            const gbuffer = GPUBufferManager.getBuffer(bufferView);

            (gbuffer as any).label = gbuffer.label || (`BufferBinding ${type.name}`);
            //
            const buffer = GPUBufferManager.getGPUBuffer(device, gbuffer);

            const offset = bufferView.byteOffset;
            const size = bufferView.byteLength;

            const gpuBufferBinding: GPUBufferBinding = {
                buffer,
                offset,
                size,
            };
            const gpuBufferBindingKey: GPUBufferBindingKey = [buffer, offset, size];
            const cache = GPUBindGroupManager.gpuBufferBindingMap.get(gpuBufferBindingKey);

            if (cache) return cache;
            GPUBindGroupManager.gpuBufferBindingMap.set(gpuBufferBindingKey, gpuBufferBinding);

            return gpuBufferBinding;
        });

        GPUBindGroupManager.getGPUBindingResourceMap.set(getGPUBindingResourceKey, result);

        return result.value;
    }

    private static getGPUExternalTexture(device: GPUDevice, videoTexture: VideoTexture)
    {
        const getGPUExternalTextureKey: GetGPUExternalTextureKey = [device, videoTexture];
        let result = GPUBindGroupManager.getGPUExternalTextureMap.get(getGPUExternalTextureKey);

        if (result) return result.value;

        result = computed(() =>
        {
            // 在提交前确保收集到正确的外部纹理。
            reactive(webgpuEvents).preSubmit;

            //
            const resource = device.importExternalTexture(videoTexture);

            return resource;
        });
        GPUBindGroupManager.getGPUExternalTextureMap.set(getGPUExternalTextureKey, result);

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
        const bufferBindingInfo = GPUBindGroupManager.getBufferBindingInfo(type);

        const size = bufferBindingInfo.size;
        // 是否存在默认值。
        const hasDefautValue = !!uniformData.bufferView;

        if (!hasDefautValue)
        {
            (uniformData as UnReadonly<BufferBinding>).bufferView = new Uint8Array(size);
        }

        const buffer = GPUBufferManager.getBuffer(uniformData.bufferView);
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
        let result = GPUBindGroupManager.bufferBindingInfoMap.get(type);

        if (result) return result;
        result = GPUBindGroupManager._getBufferBindingInfo(type);

        GPUBindGroupManager.bufferBindingInfoMap.set(type, result);

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

                GPUBindGroupManager._getBufferBindingInfo(memberInfo.type, paths.concat(memberInfo.name), offset + memberInfo.offset, bufferBindingInfo);
            }
        }
        else if (type.isArray)
        {
            const arrayInfo = type as ArrayInfo;

            for (let i = 0; i < arrayInfo.count; i++)
            {
                GPUBindGroupManager._getBufferBindingInfo(arrayInfo.format, paths.concat(`${i}`), offset + i * arrayInfo.format.size, bufferBindingInfo);
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
                Cls: GPUBindGroupManager.getTemplateDataCls(templateFormatName as any),
            });
        }
        else
        {
            bufferBindingInfo.items.push({
                paths: paths.concat(),
                offset,
                size: type.size,
                Cls: GPUBindGroupManager.getBaseTypeDataCls(type.name),
            });
        }

        return bufferBindingInfo;
    }

    private static getBaseTypeDataCls(baseTypeName: string)
    {
        const dataCls = GPUBindGroupManager.baseTypeDataCls[baseTypeName];

        console.assert(!!dataCls, `baseTypeName必须为以下值 ${Object.keys(GPUBindGroupManager.baseTypeDataCls)}`);

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
        const dataCls = GPUBindGroupManager.templateFormatDataCls[templateFormatName];

        console.assert(!!dataCls, `templateFormatName必须为以下值 ${Object.keys(GPUBindGroupManager.templateFormatDataCls)}`);

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
