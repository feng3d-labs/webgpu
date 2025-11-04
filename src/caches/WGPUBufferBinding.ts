import { effect, reactive, UnReadonly } from '@feng3d/reactivity';
import { Buffer, BufferBinding, BufferBindingInfo, ChainMap } from '@feng3d/render-api';
import { ArrayInfo, StructInfo, TemplateInfo, TypeInfo } from 'wgsl_reflect';
import { ReactiveObject } from '../ReactiveObject';
import { getGPUBuffer } from './getGPUBuffer';

export class WGPUBufferBinding extends ReactiveObject
{
    readonly gpuBufferBinding: GPUBufferBinding;

    constructor(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        super();

        this._onCreate(device, bufferBinding, type);
        this._onMap(device, bufferBinding, type);
    }

    private _onCreate(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        const r_this = reactive(this);
        const r_bufferBinding = reactive(bufferBinding);

        this.effect(() =>
        {
            // 监听

            r_bufferBinding?.bufferView;

            // 更新缓冲区绑定的数据。
            updateBufferBinding(bufferBinding, type);
            const bufferView = bufferBinding.bufferView;
            //
            const gbuffer = Buffer.getBuffer(bufferView.buffer);

            (gbuffer as any).label = gbuffer.label || (`BufferBinding ${type.name}`);
            //
            const buffer = getGPUBuffer(device, gbuffer);

            const offset = bufferView.byteOffset;
            const size = bufferView.byteLength;

            const gpuBufferBinding: GPUBufferBinding = {
                buffer,
                offset,
                size,
            };

            r_this.gpuBufferBinding = gpuBufferBinding;
        });
    }

    private _onMap(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        device.bufferBindings ??= new ChainMap();
        device.bufferBindings.set([device, bufferBinding, type], this);
        this.destroyCall(() => { device.bufferBindings.delete([device, bufferBinding, type]); });
    }

    static getInstance(device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo)
    {
        return device.bufferBindings?.get([device, bufferBinding, type]) || new WGPUBufferBinding(device, bufferBinding, type);
    }
}

declare global
{
    interface GPUDevice
    {
        bufferBindings: ChainMap<[device: GPUDevice, bufferBinding: BufferBinding, type: TypeInfo], WGPUBufferBinding>;
    }
}

/**
 * 初始化缓冲区绑定。
 *
 * @param variableInfo
 * @param uniformData
 * @returns
 */
function updateBufferBinding(uniformData: BufferBinding, type: TypeInfo)
{
    const bufferBindingInfo = getBufferBindingInfo(type);

    const size = bufferBindingInfo.size;
    // 是否存在默认值。
    const hasDefautValue = !!uniformData.bufferView;

    if (!hasDefautValue)
    {
        (uniformData as UnReadonly<BufferBinding>).bufferView = new Uint8Array(size);
    }

    const buffer = Buffer.getBuffer(uniformData.bufferView.buffer);
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

function getTemplateDataCls(templateFormatName: 'i32' | 'u32' | 'f32' | 'f16')
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
type DataCls = Float32ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Int16ArrayConstructor;