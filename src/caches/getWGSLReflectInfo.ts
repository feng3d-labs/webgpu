import { ResourceType, TemplateInfo, WgslReflect } from "wgsl_reflect";
import { IGPUBindGroupLayoutDescriptor, IGPUPipelineLayoutDescriptor } from "../internal/IGPUPipelineLayoutDescriptor";
import { DepthTextureType, ExternalSampledTextureType, MultisampledTextureType, TextureType } from "../types/TextureType";

/**
 * 从WebGPU着色器代码中获取反射信息。
 *
 * @param code WebGPU着色器代码。
 * @returns 从WebGPU着色器代码中获取的反射信息。
 */
export function getWGSLReflectInfo(code: string): WgslReflect
{
    let reflect = reflectMap[code];
    if (reflect) return reflect;

    reflect = reflectMap[code] = new WgslReflect(code);

    return reflect;
}
const reflectMap: { [code: string]: WgslReflect } = {};

export function getGPUShaderLayout(code: string): IGPUPipelineLayoutDescriptor
{
    if (shaderLayoutMap[code]) return shaderLayoutMap[code];

    const reflect = getWGSLReflectInfo(code);

    const bindGroupLayouts: IGPUBindGroupLayoutDescriptor[] = [];

    for (const uniform of reflect.uniforms)
    {
        const { group, binding } = uniform;

        bindGroupLayouts[group] = bindGroupLayouts[group] || { entries: [] };

        const layout: GPUBufferBindingLayout = {
            type: "uniform",
            minBindingSize: uniform.size,
        };

        bindGroupLayouts[group].entries[binding] = {
            variableInfo: uniform,
            visibility: Visibility_ALL, binding, buffer: layout,
        };
    }

    for (const storage of reflect.storage)
    {
        const { group, binding, name } = storage;
        bindGroupLayouts[group] = bindGroupLayouts[group] || { entries: [] };

        let layout: GPUBufferBindingLayout;
        if (storage.resourceType === ResourceType.Storage)
        {
            const type: GPUBufferBindingType = storage.access === "read_write" ? "storage" : "read-only-storage";

            // 无法确定 storage 中数据的尺寸，不设置 minBindingSize 属性。
            layout = {
                type,
            };

            bindGroupLayouts[group].entries[binding] = {
                variableInfo: storage,
                visibility: type === "storage" ? Visibility_FRAGMENT_COMPUTE : Visibility_ALL, binding, buffer: layout
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

            bindGroupLayouts[group].entries[binding] = {
                variableInfo: storage,
                visibility: Visibility_FRAGMENT_COMPUTE, binding, storageTexture: layout
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
        bindGroupLayouts[group] = bindGroupLayouts[group] || { entries: [] };

        const textureType = texture.type.name as TextureType;

        const viewDimension = TextureType[textureType][2];

        if (ExternalSampledTextureType[textureType])
        {
            bindGroupLayouts[group].entries[binding] = {
                variableInfo: texture,
                visibility: Visibility_ALL, binding, externalTexture: {}
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

            bindGroupLayouts[group].entries[binding] = {
                variableInfo: texture,
                visibility: Visibility_ALL, binding, texture: layout
            };
        }
    }

    for (const sampler of reflect.samplers)
    {
        const { group, binding, name } = sampler;
        bindGroupLayouts[group] = bindGroupLayouts[group] || { entries: [] };

        const layout: GPUSamplerBindingLayout = {};

        if (sampler.type.name === "sampler_comparison")
        {
            layout.type = "comparison";
        }

        bindGroupLayouts[group].entries[binding] = {
            variableInfo: sampler,
            visibility: Visibility_ALL, binding, sampler: layout
        };
    }

    const gpuPipelineLayout: IGPUPipelineLayoutDescriptor = { bindGroupLayouts };

    return gpuPipelineLayout;
}

const shaderLayoutMap: { [code: string]: IGPUPipelineLayoutDescriptor } = {};

/**
 * 片段与计算着色器可见。
 */
const Visibility_FRAGMENT_COMPUTE = GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
/**
 * 全部着色器可见。
 */
const Visibility_ALL = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
