import { FunctionInfo, ResourceType, TemplateInfo, TypeInfo, VariableInfo, WgslReflect } from "wgsl_reflect";
import { DepthTextureType, ExternalSampledTextureType, MultisampledTextureType, StorageTextureType, TextureType } from "../types/TextureType";
import { WGSLVertexType, wgslVertexTypeMap } from "../types/VertexFormat";

/**
 * WGSL着色器反射信息。
 */
export interface WGSLReflectInfo
{
    /**
     * 入口函数映射。
     */
    entryMap: { [entryName: string]: WGSLEntryInfo };

    /**
     * 顶点入口信息。当存在多个时取第一个。
     */
    vertexEntryList: WGSLVertexEntryInfo[];

    /**
     * 顶点入口信息映射。
     */
    vertexEntryMap: { [entryPoint: string]: WGSLVertexEntryInfo };

    /**
     * 片元入口函数。当存在多个时取第一个。
     */
    fragmentEntryList: WGSLEntryInfo[];

    /**
     * 计算入口信息映射。
     */
    fragmentEntryMap: { [entryPoint: string]: WGSLEntryInfo };

    /**
     * 计算入口函数。当存在多个时取第一个。
     */
    computeEntryList: WGSLEntryInfo[];

    /**
     * 计算入口信息映射。
     */
    computeEntryMap: { [entryPoint: string]: WGSLEntryInfo };

    /**
     * 从WebGPU着色器代码获取的绑定资源信息表。
     */
    bindingResourceLayoutMap: WGSLBindingResourceInfoMap;
}

/**
 * WGSL着色器入口信息。
 */
export interface WGSLEntryInfo
{
    /**
     * 入口点名称
     */
    entryPoint: string;
}

/**
 * 顶点入口点信息。
 */
export interface WGSLVertexEntryInfo extends WGSLEntryInfo
{
    /**
     * 入口点名称
     */
    entryPoint: string;

    /**
     * 属性信息列表。
     */
    attributeInfos: WGSLVertexAttributeInfo[];
}

/**
 * WGSL中顶点属性信息。
 */
export interface WGSLVertexAttributeInfo
{
    /**
     * 属性名称
     */
    name: string;

    /**
     * 所在着色器位置。
     */
    shaderLocation: number;

    /**
     * GPU顶点数据格式。
     */
    format: GPUVertexFormat;

    /**
     * 顶点数据在WGSL中的类型。
     */
    wgslType: WGSLVertexType;

    /**
     * 可能对应的GPU顶点数据格式列表。
     */
    possibleFormats: GPUVertexFormat[];
}

/**
 * WebGPU着色器代码中获取的绑定资源信息。
 */
export interface WGSLBindingResourceInfo
{
    group: number,
    variableInfo: VariableInfo
    entry: GPUBindGroupLayoutEntry
}

/**
 * 从WebGPU着色器代码获取的绑定资源信息表。
 */
export type WGSLBindingResourceInfoMap = { [name: string]: WGSLBindingResourceInfo };

/**
 * 从WebGPU着色器代码中获取反射信息。
 *
 * @param code WebGPU着色器代码。
 * @returns 从WebGPU着色器代码中获取的反射信息。
 */
export function getWGSLReflectInfo(code: string)
{
    let reflectInfo = reflectMap.get(code);
    if (reflectInfo) return reflectInfo;

    const reflect = new WgslReflect(code);

    //
    reflectInfo = {
        entryMap: {},
        vertexEntryList: [],
        vertexEntryMap: {},
        fragmentEntryList: [],
        fragmentEntryMap: {},
        computeEntryList: [],
        computeEntryMap: {},
        bindingResourceLayoutMap: {},
    };

    //
    reflect.entry.vertex.forEach((v) =>
    {
        const name = v.name;
        const attributeInfos = getAttributeInfos(v);

        const vertexEntry: WGSLVertexEntryInfo = { entryPoint: name, attributeInfos };

        reflectInfo.entryMap[vertexEntry.entryPoint] = vertexEntry;
        reflectInfo.vertexEntryMap[vertexEntry.entryPoint] = vertexEntry;
        reflectInfo.vertexEntryList.push(vertexEntry);
    });
    reflect.entry.fragment.forEach((v) =>
    {
        const name = v.name;
        const entryInfo: WGSLEntryInfo = { entryPoint: name };

        reflectInfo.entryMap[entryInfo.entryPoint] = entryInfo;
        reflectInfo.fragmentEntryMap[entryInfo.entryPoint] = entryInfo;
        reflectInfo.fragmentEntryList.push(entryInfo);
    });
    reflect.entry.compute.forEach((v) =>
    {
        const name = v.name;
        const entryInfo: WGSLEntryInfo = { entryPoint: name };

        reflectInfo.entryMap[entryInfo.entryPoint] = entryInfo;
        reflectInfo.computeEntryMap[entryInfo.entryPoint] = entryInfo;
        reflectInfo.computeEntryList.push(entryInfo);
    });

    //
    reflectInfo.bindingResourceLayoutMap = getWGSLBindingResourceInfoMap(reflect, code);

    //
    reflectMap.set(code, reflectInfo);

    return reflectInfo;
}
const reflectMap = new Map<string, WGSLReflectInfo>();

/**
 * 从WebGPU着色器代码获取绑定资源信息表。
 *
 * @param code WebGPU着色器代码。
 * @returns 从WebGPU着色器代码获取的绑定资源信息表。
 */
function getWGSLBindingResourceInfoMap(reflect: WgslReflect, code: string)
{
    const bindingResourceLayoutMap: WGSLBindingResourceInfoMap = {};

    for (const uniform of reflect.uniforms)
    {
        const { group, binding, name } = uniform;

        const layout: GPUBufferBindingLayout = {
            type: "uniform",
            minBindingSize: uniform.size,
        };

        bindingResourceLayoutMap[name] = {
            group, variableInfo: uniform,
            entry: { visibility: Visibility_ALL, binding, buffer: layout, },
        };
    }

    for (const storage of reflect.storage)
    {
        const { group, binding, name } = storage;

        let layout: GPUBufferBindingLayout;
        if (storage.resourceType === ResourceType.Storage)
        {
            const type: GPUBufferBindingType = storage.access === "read_write" ? "storage" : "read-only-storage";

            // 无法确定 storage 中数据的尺寸，不设置 minBindingSize 属性。
            layout = {
                type,
            };

            bindingResourceLayoutMap[name] = {
                group, variableInfo: storage,
                entry: { visibility: type === "storage" ? Visibility_FRAGMENT_COMPUTE : Visibility_ALL, binding, buffer: layout },
            };
        }
        else if (storage.resourceType === ResourceType.StorageTexture)
        {
            const textureSecondType = (storage.type as TemplateInfo)?.format?.name as GPUTextureFormat;

            const textureType = storage.type.name as TextureType;

            const viewDimension = TextureType[textureType][2];

            const access = (storage.type as TemplateInfo).access;
            console.assert(access === "write");

            const layout: GPUStorageTextureBindingLayout = {
                access: "write-only",
                format: textureSecondType as any,
                viewDimension,
            };

            bindingResourceLayoutMap[name] = {
                group, variableInfo: storage,
                entry: { visibility: Visibility_FRAGMENT_COMPUTE, binding, storageTexture: layout },
            };
        }
        else
        {
            console.error(`遇到错误资源类型 ${storage.resourceType}，无法处理！`);
        }
    }

    for (const texture of reflect.textures)
    {
        const { group, binding, name } = texture;

        const textureType = texture.type.name as TextureType;

        const viewDimension = TextureType[textureType][2];

        if (ExternalSampledTextureType[textureType])
        {
            bindingResourceLayoutMap[name] = {
                group, variableInfo: texture,
                entry: { visibility: Visibility_ALL, binding, externalTexture: { layout: {} } },
            };
        }
        else
        {
            const textureSecondType = (texture.type as TemplateInfo)?.format?.name as "f32" | "u32" | "i32";

            let sampleType: GPUTextureSampleType;
            if (DepthTextureType[textureType])
            {
                sampleType = "depth";
            }
            else if (textureSecondType === "f32")
            {
                sampleType = "float";
                // 判断是否使用 `textureLoad` 函数 对当前纹理进行非过滤采样。
                const result = new RegExp(`\\s*textureLoad\\s*\\(\\s*${name}`).exec(code);
                if (result)
                {
                    sampleType = "unfilterable-float";
                }
            }
            else if (textureSecondType === "u32")
            {
                sampleType = "uint";
            }
            else if (textureSecondType === "i32")
            {
                sampleType = "sint";
            }
            else
            {
                throw `无法识别纹理着色器类型 ${textureSecondType}`;
            }

            const layout: GPUTextureBindingLayout = {
                sampleType,
                viewDimension,
            };

            // 识别多重采样
            if (MultisampledTextureType[textureType])
            {
                layout.multisampled = true;
            }

            bindingResourceLayoutMap[name] = {
                group, variableInfo: texture,
                entry: { visibility: Visibility_ALL, binding, texture: layout },
            };
        }
    }

    for (const sampler of reflect.samplers)
    {
        const { group, binding, name } = sampler;

        const layout: GPUSamplerBindingLayout = {};

        if (sampler.type.name === "sampler_comparison")
        {
            layout.type = "comparison";
        }

        bindingResourceLayoutMap[name] = {
            group, variableInfo: sampler,
            entry: { visibility: Visibility_ALL, binding, sampler: layout },
        };
    }

    return bindingResourceLayoutMap;
}

/**
 * 片段与计算着色器可见。
 */
const Visibility_FRAGMENT_COMPUTE = GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
/**
 * 全部着色器可见。
 */
const Visibility_ALL = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;

/**
 * 从顶点入口函数信息中获取顶点属性信息。
 *
 * @param vertexFunctionInfo 顶点入口函数信息。
 * @returns 顶点属性信息。
 */
function getAttributeInfos(vertexFunctionInfo: FunctionInfo)
{
    const attributeInfos: WGSLVertexAttributeInfo[] = [];

    vertexFunctionInfo.inputs.forEach((v) =>
    {
        // 跳过内置属性。
        if (v.locationType === "builtin")
        {
            return;
        }

        const shaderLocation = v.location as number;
        const attributeName = v.name;

        const wgslType = getWGSLType(v.type);

        const format = wgslVertexTypeMap[wgslType].format;
        const possibleFormats = wgslVertexTypeMap[wgslType].possibleFormats;

        attributeInfos.push({ name: attributeName, shaderLocation, format, wgslType, possibleFormats });
    });

    return attributeInfos;
}

function getWGSLType(type: TypeInfo)
{
    let wgslType = type.name;
    if (isTemplateType(type))
    {
        wgslType += `<${type.format.name}>`;
    }

    return wgslType as WGSLVertexType;
}

function isTemplateType(type: TypeInfo): type is TemplateInfo
{
    return !!(type as TemplateInfo).format;
}
