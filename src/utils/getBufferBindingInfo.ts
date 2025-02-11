import { ArrayInfo, StructInfo, TemplateInfo, TypeInfo } from "wgsl_reflect";

/**
 * 获取缓冲区绑定信息。
 * 
 * @param type 类型信息。
 * @param paths 当前路径。
 * @param offset 当前编译。
 * @param bufferBindingInfo 缓冲区绑定信息。
 * @returns 
 */
export function getBufferBindingInfo(type: TypeInfo, paths: string[] = [], offset = 0, bufferBindingInfo: IBufferBindingInfo = { size: type.size, items: [] })
{
    if (type.isStruct)
    {
        const structInfo = type as StructInfo;
        for (let i = 0; i < structInfo.members.length; i++)
        {
            const memberInfo = structInfo.members[i];
            getBufferBindingInfo(memberInfo.type, paths.concat(memberInfo.name), offset + memberInfo.offset, bufferBindingInfo);
        }
    }
    else if (type.isArray)
    {
        const arrayInfo = type as ArrayInfo;
        for (let i = 0; i < arrayInfo.count; i++)
        {
            getBufferBindingInfo(arrayInfo.format, paths.concat("" + i), offset + i * arrayInfo.format.size, bufferBindingInfo);
        }
    }
    else if (type.isTemplate)
    {
        const templateInfo = type as TemplateInfo;
        const templateFormatName = templateInfo.format?.name
        bufferBindingInfo.items.push({
            paths: paths.concat(),
            offset: offset,
            size: templateInfo.size,
            Cls: getTemplateDataCls(templateFormatName as any),
        });
    }
    else
    {
        bufferBindingInfo.items.push({
            paths: paths.concat(),
            offset: offset,
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
    "i32": Int32Array,
    "u32": Uint32Array,
    "f32": Float32Array,
    "f16": Int16Array,
    "vec2i": Int32Array,
    "vec3i": Int32Array,
    "vec4i": Int32Array,
    "vec2u": Uint32Array,
    "vec3u": Uint32Array,
    "vec4u": Uint32Array,
    "vec2f": Float32Array,
    "vec3f": Float32Array,
    "vec4f": Float32Array,
    "vec2h": Int16Array,
    "vec3h": Int16Array,
    "vec4h": Int16Array,
    "mat2x2f": Float32Array,
    "mat2x3f": Float32Array,
    "mat2x4f": Float32Array,
    "mat3x2f": Float32Array,
    "mat3x3f": Float32Array,
    "mat3x4f": Float32Array,
    "mat4x2f": Float32Array,
    "mat4x3f": Float32Array,
    "mat4x4f": Float32Array,
    "mat2x2h": Float32Array,
    "mat2x3h": Float32Array,
    "mat2x4h": Float32Array,
    "mat3x2h": Float32Array,
    "mat3x3h": Float32Array,
    "mat3x4h": Float32Array,
    "mat4x2h": Float32Array,
    "mat4x3h": Float32Array,
    "mat4x4h": Float32Array,
};

function getTemplateDataCls(templateFormatName: "i32" | "u32" | "f32" | "f16")
{

    const dataCls = templateFormatDataCls[templateFormatName];

    console.assert(!!dataCls, `templateFormatName必须为以下值 ${Object.keys(templateFormatDataCls)}`);

    return dataCls;
}
const templateFormatDataCls: { [key: string]: DataCls } = {
    "i32": Int32Array,
    "u32": Uint32Array,
    "f32": Float32Array,
    "f16": Int16Array,
};

type DataCls = Float32ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Int16ArrayConstructor

/**
 * 缓冲区绑定信息。
 */
export interface IBufferBindingInfo
{
    size: number;
    items: {
        paths: string[];
        offset: number;
        size: number;
        Cls: DataCls;
    }[]
}
