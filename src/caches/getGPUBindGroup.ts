import { BindingResources, BufferBinding, BufferBindingInfo, ChainMap, computed, ComputedRef, reactive, Sampler, TextureView, UnReadonly } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { ArrayInfo, ResourceType, StructInfo, TemplateInfo, TypeInfo, VariableInfo } from "wgsl_reflect";
import { VideoTexture } from "../data/VideoTexture";
import { webgpuEvents } from "../eventnames";
import { ExternalSampledTextureType } from "../types/TextureType";
import { getGPUBuffer } from "./getGPUBuffer";
import { getGPUSampler } from "./getGPUSampler";
import { getGPUTextureView } from "./getGPUTextureView";
import { getGBuffer } from "./getIGPUBuffer";

export function getGPUBindGroup(device: GPUDevice, bindGroupLayout: GPUBindGroupLayout, bindingResources: BindingResources)
{
    const getGPUBindGroupKey: GetGPUBindGroupKey = [device, bindGroupLayout, bindingResources];
    let result = getGPUBindGroupMap.get(getGPUBindGroupKey);
    if (result) return result.value;

    let gBindGroup: GPUBindGroup;
    result = computed(() =>
    {
        const entries = bindGroupLayout.entries.map((v) =>
        {
            const { name, type, resourceType, binding } = v.variableInfo;

            const entry: GPUBindGroupEntry = { binding, resource: null };

            //
            if (resourceType === ResourceType.Uniform || resourceType === ResourceType.Storage)
            {
                entry.resource = getGPUBindingResource(device, bindingResources, name, type);
            }
            else if (ExternalSampledTextureType[type.name]) // 判断是否为外部纹理
            {
                entry.resource = getGPUExternalTexture(device, bindingResources[name] as VideoTexture);
            }
            else if (resourceType === ResourceType.Texture || resourceType === ResourceType.StorageTexture)
            {
                entry.resource = getGPUTextureView(device, bindingResources[name] as TextureView);
            }
            else
            {
                entry.resource = getGPUSampler(device, bindingResources[name] as Sampler);
            }

            return entry;
        });

        gBindGroup = device.createBindGroup({ layout: bindGroupLayout, entries });

        return gBindGroup;
    });
    getGPUBindGroupMap.set(getGPUBindGroupKey, result);

    return result.value;
}
type GetGPUBindGroupKey = [device: GPUDevice, bindGroupLayout: GPUBindGroupLayout, bindingResources: BindingResources];
const getGPUBindGroupMap = new ChainMap<GetGPUBindGroupKey, ComputedRef<GPUBindGroup>>();

function getGPUBindingResource(device: GPUDevice, bindingResources: BindingResources, name: string, type: TypeInfo)
{
    const getGPUBindingResourceKey: GetGPUBindingResourceKey = [device, bindingResources, name, type];
    let result = getGPUBindingResourceMap.get(getGPUBindingResourceKey);
    if (result) return result.value;

    let numberBufferBinding: number[];
    result = computed(() =>
    {
        // 监听
        const r_bindingResources = reactive(bindingResources);
        (r_bindingResources[name] as BufferBinding)?.bufferView;

        // 执行
        let resource = bindingResources[name];
        // 当值为number时，将其视为一个数组。
        if (typeof resource === "number")
        {
            numberBufferBinding ??= [];
            numberBufferBinding[0] = resource;
            resource = numberBufferBinding;
        }
        const bufferBinding = resource as BufferBinding; // 值为number且不断改变时将可能会产生无数细碎gpu缓冲区。
        // 更新缓冲区绑定的数据。
        updateBufferBinding(type, bufferBinding);
        //
        const gbuffer = getGBuffer(bufferBinding.bufferView);
        (gbuffer as any).label = gbuffer.label || (`BufferBinding ${name}`);
        //
        const buffer = getGPUBuffer(device, gbuffer);

        const offset = bufferBinding.bufferView.byteOffset;
        const size = bufferBinding.bufferView.byteLength;

        const gpuBindingResource: GPUBindingResource = {
            buffer,
            offset,
            size,
        };

        return gpuBindingResource;
    });

    getGPUBindingResourceMap.set(getGPUBindingResourceKey, result);

    return result.value;
}
type GetGPUBindingResourceKey = [device: GPUDevice, bindingResources: BindingResources, name: string, type: TypeInfo];
const getGPUBindingResourceMap = new ChainMap<GetGPUBindingResourceKey, ComputedRef<GPUBindingResource>>();

function getGPUExternalTexture(device: GPUDevice, videoTexture: VideoTexture)
{
    let result = getGPUExternalTextureMap.get(videoTexture);
    if (result) return result.value;

    result = computed(() =>
    {
        // 监听 
        reactive(webgpuEvents).preSubmit;

        //
        const resource = device.importExternalTexture(videoTexture);

        return resource;
    });
    getGPUExternalTextureMap.set(videoTexture, result);

    return result.value;
}
const getGPUExternalTextureMap = new WeakMap<VideoTexture, ComputedRef<GPUExternalTexture>>();


/**
 * 初始化缓冲区绑定。
 *
 * @param variableInfo
 * @param uniformData
 * @returns
 */
export function updateBufferBinding(type: TypeInfo, uniformData: BufferBinding)
{
    const bufferBindingInfo = getBufferBindingInfo(type);
    if (uniformData["_variableInfo"] !== undefined)
    {
        const preVariableInfo = uniformData["_variableInfo"] as any as VariableInfo;
        if (preVariableInfo.size !== bufferBindingInfo.size)
        {
            console.warn(`updateBufferBinding ${preVariableInfo.name} 出现一份数据对应多个 variableInfo`, { uniformData, bufferBindingInfo, preVariableInfo });
        }
    }
    else
    {
        uniformData["_variableInfo"] = bufferBindingInfo as any;
    }

    const size = bufferBindingInfo.size;
    // 是否存在默认值。
    const hasDefautValue = !!uniformData.bufferView;
    if (!hasDefautValue)
    {
        (uniformData as UnReadonly<BufferBinding>).bufferView = new Uint8Array(size);
    }

    const buffer = getGBuffer(uniformData.bufferView);
    const offset = uniformData.bufferView.byteOffset;

    for (let i = 0; i < bufferBindingInfo.items.length; i++)
    {
        const { paths, offset: itemInfoOffset, size: itemInfoSize, Cls } = bufferBindingInfo.items[i];
        // 更新数据
        computed(() =>
        {
            // 监听
            let value: any = reactive(uniformData);
            for (let i = 0; i < paths.length; i++)
            {
                value = value[paths[i]];
                if (value === undefined)
                {
                    if (!hasDefautValue)
                    {
                        console.warn(`没有找到 统一块变量属性 ${paths.join(".")} 的值！`);
                    }

                    return;
                }
            }

            // 更新数据
            let data: Float32Array | Int32Array | Uint32Array | Int16Array;
            if (typeof value === "number")
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
        }).value;
    }
}

/**
 * 获取缓冲区绑定信息。
 *
 * @param type 类型信息。
 * @returns
 */
function getBufferBindingInfo(type: TypeInfo)
{
    let result = bufferBindingInfoMap.get(type);
    if (result) return result;
    result = _getBufferBindingInfo(type);

    bufferBindingInfoMap.set(type, result);
    return result;
}
const bufferBindingInfoMap = new Map<TypeInfo, BufferBindingInfo>();

/**
 * 获取缓冲区绑定信息。
 *
 * @param type 类型信息。
 * @param paths 当前路径。
 * @param offset 当前编译。
 * @param bufferBindingInfo 缓冲区绑定信息。
 * @returns
 */
function _getBufferBindingInfo(type: TypeInfo, paths: string[] = [], offset = 0, bufferBindingInfo: BufferBindingInfo = { size: type.size, items: [] })
{
    if (type.isStruct)
    {
        const structInfo = type as StructInfo;
        for (let i = 0; i < structInfo.members.length; i++)
        {
            const memberInfo = structInfo.members[i];
            _getBufferBindingInfo(memberInfo.type, paths.concat(memberInfo.name), offset + memberInfo.offset, bufferBindingInfo);
        }
    }
    else if (type.isArray)
    {
        const arrayInfo = type as ArrayInfo;
        for (let i = 0; i < arrayInfo.count; i++)
        {
            _getBufferBindingInfo(arrayInfo.format, paths.concat(`${i}`), offset + i * arrayInfo.format.size, bufferBindingInfo);
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
            Cls: getTemplateDataCls(templateFormatName as any),
        });
    }
    else
    {
        bufferBindingInfo.items.push({
            paths: paths.concat(),
            offset,
            size: type.size,
            Cls: getBaseTypeDataCls(type.name),
        });
    }

    return bufferBindingInfo;
}

function getBaseTypeDataCls(baseTypeName: string)
{
    const dataCls = baseTypeDataCls[baseTypeName];

    console.assert(!!dataCls, `baseTypeName必须为以下值 ${Object.keys(baseTypeDataCls)}`);

    return dataCls;
}

/**
 * @see https://gpuweb.github.io/gpuweb/wgsl/#vec2i
 */
const baseTypeDataCls: { [key: string]: DataCls } = {
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

function getTemplateDataCls(templateFormatName: "i32" | "u32" | "f32" | "f16")
{
    const dataCls = templateFormatDataCls[templateFormatName];

    console.assert(!!dataCls, `templateFormatName必须为以下值 ${Object.keys(templateFormatDataCls)}`);

    return dataCls;
}
const templateFormatDataCls: { [key: string]: DataCls } = {
    i32: Int32Array,
    u32: Uint32Array,
    f32: Float32Array,
    f16: Int16Array,
};

type DataCls = Float32ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Int16ArrayConstructor;

