import { BlendComponent, BlendState, ChainMap, ColorTargetState, computed, ComputedRef, DepthStencilState, FragmentState, IIndicesDataTypes, PrimitiveState, reactive, RenderPipeline, StencilFaceState, toRaw, VertexAttributes, vertexFormatMap, VertexState, WGSLVertexType, WriteMask } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { FunctionInfo, TemplateInfo, TypeInfo } from "wgsl_reflect";

import { gPartial } from "@feng3d/polyfill";
import { MultisampleState } from "../data/MultisampleState";
import { NVertexBuffer } from "../internal/NGPUVertexBuffer";
import { RenderPassFormat } from "../internal/RenderPassFormat";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *
 * @param renderPipeline 渲染管线描述。
 * @param renderPass 渲染通道描述。
 * @param vertices 顶点属性数据映射。
 * @returns 完整的渲染管线描述以及顶点缓冲区数组。
 */
export function getNGPURenderPipeline(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indices: IIndicesDataTypes)
{
    const indexFormat = indices ? (indices.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16") : undefined;

    let result = device._renderPipelineMap.get([renderPipeline, renderPassFormat._key, vertices, indexFormat]);
    if (result) return result;

    // 获取完整的顶点阶段描述与顶点缓冲区列表。
    const vertexStateResult = getNGPUVertexState(device, renderPipeline.vertex, vertices);

    // 从渲染通道上获取多重采样数量
    const gpuMultisampleState = getGPUMultisampleState(renderPipeline.multisample, renderPassFormat.sampleCount);

    const gpuRenderPipeline = computed(() =>
    {
        // 
        reactive(renderPipeline).label;
        const label = renderPipeline.label;

        // 更新管线布局
        reactive(renderPipeline).vertex.code;
        reactive(renderPipeline).fragment?.code
        const layout = getGPUPipelineLayout(device, { vertex: renderPipeline.vertex.code, fragment: renderPipeline.fragment?.code });

        // 
        reactive(renderPipeline).fragment;
        const fragment = getGPUFragmentState(device, renderPipeline.fragment, renderPassFormat.colorFormats);

        // 
        reactive(renderPipeline).primitive;
        const primitive = getGPUPrimitiveState(renderPipeline.primitive, indexFormat);

        // 获取深度模板阶段完整描述。
        reactive(renderPipeline).depthStencil;
        const depthStencil = getGPUDepthStencilState(renderPipeline.depthStencil, renderPassFormat.depthStencilFormat);

        //
        const gpuRenderPipelineDescriptor: GPURenderPipelineDescriptor = {
            label,
            layout,
            vertex: vertexStateResult.gpuVertexState,
            fragment,
            primitive,
            depthStencil,
            multisample: gpuMultisampleState,
        };

        const gpuRenderPipeline = device.createRenderPipeline(gpuRenderPipelineDescriptor);

        return gpuRenderPipeline;
    });

    result = { _version: 0, pipeline: gpuRenderPipeline, vertexBuffers: vertexStateResult.vertexBuffers };
    device._renderPipelineMap.set([renderPipeline, renderPassFormat._key, vertices, indexFormat], result);

    // 监听管线变化
    const onchanged = () =>
    {
        result._version++;
        renderPipeline._version = ~~renderPipeline._version + 1;
        device._renderPipelineMap.delete([renderPipeline, renderPassFormat._key, vertices, indexFormat]);
        watcher.unwatch(vertexStateResult, "_version", onchanged);
    }
    watcher.watch(vertexStateResult, "_version", onchanged);

    return result;
}

function getGPUPrimitiveState(primitive?: PrimitiveState, indexFormat?: GPUIndexFormat): GPUPrimitiveState
{
    if (!primitive) return defaultGPUPrimitiveState;

    const result: ComputedRef<GPUPrimitiveState> = primitive["_cache_GPUPrimitiveState_" + indexFormat] ??= computed(() =>
    {
        let { topology, cullFace, frontFace, unclippedDepth } = reactive(primitive);

        //
        const gpuPrimitive: GPUPrimitiveState = {
            topology: topology ?? "triangle-list",
            stripIndexFormat: (topology === "triangle-strip" || topology === "line-strip") ? indexFormat : undefined,
            frontFace: frontFace ?? "ccw",
            cullMode: cullFace ?? "none",
            unclippedDepth: unclippedDepth ?? false,
        };

        return gpuPrimitive;
    });

    return result.value;
}
const defaultGPUPrimitiveState: GPUPrimitiveState = { topology: "triangle-list", cullMode: "none", frontFace: "ccw", }

function getGPUMultisampleState(multisampleState?: MultisampleState, sampleCount?: 4)
{
    if (!sampleCount) return undefined;

    const gpuMultisampleState: GPUMultisampleState = {
        ...multisampleState,
        count: sampleCount,
    };

    return gpuMultisampleState;
}

/**
 * 获取深度模板阶段完整描述。
 *
 * @param depthStencil 深度模板阶段描述。
 * @param depthStencilFormat 深度模板附件纹理格式。
 * @returns 深度模板阶段完整描述。
 */
function getGPUDepthStencilState(depthStencil: DepthStencilState, depthStencilFormat?: GPUTextureFormat)
{
    if (!depthStencilFormat) return undefined;

    if (!depthStencil) return { format: depthStencilFormat };

    const result: ComputedRef<GPUDepthStencilState> = depthStencil["_cache_GPUDepthStencilState_" + depthStencilFormat] = computed(() =>
    {
        const { depthWriteEnabled, depthCompare, stencilFront, stencilBack, stencilReadMask, stencilWriteMask, depthBias, depthBiasSlopeScale, depthBiasClamp } = reactive(depthStencil);

        //
        const gpuDepthStencilState: GPUDepthStencilState = {
            format: depthStencilFormat,
            depthWriteEnabled: depthWriteEnabled ?? true,
            depthCompare: depthCompare ?? "less",
            stencilFront: getGPUStencilFaceState(toRaw(stencilFront)),
            stencilBack: getGPUStencilFaceState(toRaw(stencilBack)),
            stencilReadMask: stencilReadMask ?? 0xFFFFFFFF,
            stencilWriteMask: stencilWriteMask ?? 0xFFFFFFFF,
            depthBias: depthBias ?? 0,
            depthBiasSlopeScale: depthBiasSlopeScale ?? 0,
            depthBiasClamp: depthBiasClamp ?? 0,
        };

        return gpuDepthStencilState;
    });

    return result.value;
}

function getGPUStencilFaceState(stencilFaceState?: StencilFaceState)
{
    if (!stencilFaceState) return {};

    const result: ComputedRef<GPUStencilFaceState> = stencilFaceState["_cache_GPUStencilFaceState"] = computed(() =>
    {
        const { compare, failOp, depthFailOp, passOp } = reactive(stencilFaceState);

        const gpuStencilFaceState: GPUStencilFaceState = {
            compare: compare ?? "always",
            failOp: failOp ?? "keep",
            depthFailOp: depthFailOp ?? "keep",
            passOp: passOp ?? "keep",
        };

        return gpuStencilFaceState;
    })

    return result.value;
}

/**
 * 获取完整的顶点阶段描述与顶点缓冲区列表。
 *
 * @param vertexState 顶点阶段信息。
 * @param vertices 顶点数据。
 * @returns 完整的顶点阶段描述与顶点缓冲区列表。
 */
function getNGPUVertexState(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
{
    let result = vertexStateMap.get([vertexState, vertices]);
    if (result) return result;

    const vertexEntryFunctionInfo = getVertexEntryFunctionInfo(vertexState);

    const { vertexBufferLayouts, vertexBuffers } = getNGPUVertexBuffers(vertexEntryFunctionInfo, vertices);

    const gpuVertexState: GPUVertexState = {
        module: getGPUShaderModule(device, vertexState.code),
        entryPoint: vertexEntryFunctionInfo.name,
        buffers: vertexBufferLayouts,
        constants: vertexState.constants,
    };

    //
    result = { _version: 0, gpuVertexState, vertexBuffers };
    vertexStateMap.set([vertexState, vertices], result);

    // 监听变化
    const watchpropertys: gPartial<VertexState> = { code: "" };
    const onchanged = () =>
    {
        vertexStateMap.delete([vertexState, vertices]);
        watcher.unwatchobject(vertexState, watchpropertys, onchanged);
        result._version++;
    };
    watcher.watchobject(vertexState, watchpropertys, onchanged);

    return result;
}

/**
 * 获取顶点入口函数信息。
 * 
 * @param vertexState 顶点阶段信息。
 * @returns 
 */
function getVertexEntryFunctionInfo(vertexState: VertexState)
{
    let vertexEntryFunctionInfo: FunctionInfo = vertexState["_vertexEntry"];
    if (vertexEntryFunctionInfo) return vertexEntryFunctionInfo;

    const code = vertexState.code;

    // 解析顶点着色器
    const reflect = getWGSLReflectInfo(code);
    //
    if (vertexState.entryPoint)
    {
        vertexEntryFunctionInfo = reflect.entry.vertex.filter((v) => v.name === vertexState.entryPoint)[0];
        console.assert(!!vertexEntryFunctionInfo, `WGSL着色器 ${code} 中不存在顶点入口点 ${vertexState.entryPoint} 。`);
    }
    else
    {
        vertexEntryFunctionInfo = reflect.entry.vertex[0];
        console.assert(!!reflect.entry.vertex[0], `WGSL着色器 ${code} 中不存在顶点入口点。`);
    }

    vertexState["_vertexEntry"] = vertexEntryFunctionInfo;

    return vertexEntryFunctionInfo;
}

const vertexStateMap = new ChainMap<[VertexState, VertexAttributes], {
    gpuVertexState: GPUVertexState;
    vertexBuffers: NVertexBuffer[];
    /**
     * 版本号，用于版本控制。
     */
    _version: number;
}>();

/**
 * 从顶点属性信息与顶点数据中获取顶点缓冲区布局数组以及顶点缓冲区数组。
 *
 * @param vertex 顶点着色器函数信息。
 * @param vertices 顶点数据。
 * @returns 顶点缓冲区布局数组以及顶点缓冲区数组。
 */
function getNGPUVertexBuffers(vertex: FunctionInfo, vertices: VertexAttributes)
{
    const vertexBufferLayouts: GPUVertexBufferLayout[] = [];

    const vertexBuffers: NVertexBuffer[] = [];

    const map = new Map<any, number>();

    vertex.inputs.forEach((v) =>
    {
        // 跳过内置属性。
        if (v.locationType === "builtin") return;

        const shaderLocation = v.location as number;
        const attributeName = v.name;

        const vertexAttribute = vertices[attributeName];
        console.assert(!!vertexAttribute, `在提供的顶点属性数据中未找到 ${attributeName} 。`);
        //
        const data = vertexAttribute.data;
        const attributeOffset = vertexAttribute.offset || 0;
        let arrayStride = vertexAttribute.arrayStride;
        const stepMode = vertexAttribute.stepMode;
        const format = vertexAttribute.format;
        // 检查提供的顶点数据格式是否与着色器匹配
        // const wgslType = getWGSLType(v.type);
        // let possibleFormats = wgslVertexTypeMap[wgslType].possibleFormats;
        // console.assert(possibleFormats.indexOf(format) !== -1, `顶点${attributeName} 提供的数据格式 ${format} 与着色器中类型 ${wgslType} 不匹配！`);
        console.assert(data.constructor.name === vertexFormatMap[format].typedArrayConstructor.name,
            `顶点${attributeName} 提供的数据类型 ${data.constructor.name} 与格式 ${format} 不匹配！请使用 ${data.constructor.name} 来组织数据或者更改数据格式。`);

        // 如果 偏移值大于 单个顶点尺寸，则该值被放入 IGPUVertexBuffer.offset。
        const vertexByteSize = vertexFormatMap[format].byteSize;
        //
        if (!arrayStride)
        {
            arrayStride = vertexByteSize;
        }
        console.assert(attributeOffset + vertexByteSize <= arrayStride, `offset(${attributeOffset}) + vertexByteSize(${vertexByteSize}) 必须不超出 arrayStride(${arrayStride})。`);

        watcher.watch(vertexAttribute, "data", () =>
        {
            const index = map.get(data);
            const attributeData = vertexAttribute.data;

            vertexBuffers[index].data = attributeData;
            vertexBuffers[index].offset = attributeData.byteOffset;
            vertexBuffers[index].size = attributeData.byteLength;
        });

        let index = map.get(data);
        if (index === undefined)
        {
            index = vertexBufferLayouts.length;
            map.set(data, index);

            vertexBuffers[index] = { data, offset: data.byteOffset, size: data.byteLength };

            //
            vertexBufferLayouts[index] = { stepMode, arrayStride, attributes: [] };
        }
        else
        {
            // 要求同一顶点缓冲区中 arrayStride 与 stepMode 必须相同。
            const gpuVertexBufferLayout = vertexBufferLayouts[index];
            console.assert(gpuVertexBufferLayout.arrayStride === arrayStride);
            console.assert(gpuVertexBufferLayout.stepMode === stepMode);
        }

        (vertexBufferLayouts[index].attributes as Array<GPUVertexAttribute>).push({ shaderLocation, offset: attributeOffset, format });
    });

    return { vertexBufferLayouts, vertexBuffers };
}

function getGPUColorTargetState(colorTargetState: ColorTargetState, format: GPUTextureFormat)
{
    if (!colorTargetState) return { format, blend: getGPUBlendState(undefined), writeMask: getGPUColorWriteFlags(undefined) };

    const result: ComputedRef<GPUColorTargetState> = colorTargetState["_GPUColorTargetState_" + format] ??= computed(() =>
    {
        //
        reactive(colorTargetState)?.writeMask;
        const writeMask = getGPUColorWriteFlags(colorTargetState?.writeMask);

        reactive(colorTargetState)?.blend;
        const blend = getGPUBlendState(colorTargetState?.blend);

        //
        const gpuColorTargetState: GPUColorTargetState = {
            format,
            blend,
            writeMask,
        };

        return gpuColorTargetState;
    });

    return result.value;
}

/**
 * 获取片段阶段完整描述。
 *
 * @param fragmentState 片段简单阶段。
 * @param colorAttachmentTextureFormats 颜色附件格式。
 * @returns 片段阶段完整描述。
 */
function getGPUFragmentState(device: GPUDevice, fragmentState: FragmentState, colorAttachments: readonly GPUTextureFormat[])
{
    if (!fragmentState) return undefined;

    const colorAttachmentsKey = colorAttachments.toLocaleString();

    let gpuFragmentState = device._fragmentStateMap.get([fragmentState, colorAttachmentsKey]);
    if (gpuFragmentState) return gpuFragmentState.value;

    gpuFragmentState = computed(() =>
    {
        // 监听着色器代码变化
        reactive(fragmentState).code;
        const module = getGPUShaderModule(device, fragmentState.code);

        // 监听着色器入口点变化
        const entryPoint = getEntryPoint(fragmentState);

        // 监听渲染目标变化
        reactive(fragmentState).targets;
        const targets = getGPUColorTargetStates(fragmentState.targets, colorAttachments);

        // 监听常量变化
        const r_constants = reactive(fragmentState).constants;
        for (const key in r_constants) { r_constants[key]; }

        //
        return {
            module,
            entryPoint,
            targets,
            constants: fragmentState.constants
        } as GPUFragmentState;
    });

    device._fragmentStateMap.set([fragmentState, colorAttachmentsKey], gpuFragmentState);

    return gpuFragmentState.value;
}

function getGPUColorTargetStates(targets: readonly ColorTargetState[], colorAttachments: readonly GPUTextureFormat[]): GPUColorTargetState[]
{
    if (!targets)
    {
        return undefinedMap["_GPUColorTargetStates_" + colorAttachments.toString()] ??= colorAttachments.map((format) =>
        {
            return getGPUColorTargetState(undefined, format);
        });
    };

    const result: ComputedRef<GPUColorTargetState[]> = targets["_GPUColorTargetStates_" + colorAttachments.toString()] ??= computed(() =>
    {
        return colorAttachments.map((format, i) =>
        {
            if (!format) return undefined;

            //
            reactive(targets)[i];
            const gpuColorTargetState = getGPUColorTargetState(targets?.[i], format);

            return gpuColorTargetState;
        });
    });

    return result.value;
}
const undefinedMap: { [key: string]: GPUColorTargetState[] } = {};

function getEntryPoint(fragmentState: FragmentState)
{
    const result: ComputedRef<string> = fragmentState["_entryPoint"] ??= computed(() =>
    {
        // 监听着色器入口点变化
        reactive(fragmentState).entryPoint;

        // 
        let entryPoint = fragmentState.entryPoint;
        if (entryPoint) return entryPoint;

        // 监听着色器代码变化
        reactive(fragmentState).code;

        // 计算片元着色器入口点
        const code = fragmentState.code;
        let fragment: FunctionInfo;
        if (!entryPoint)
        {
            const reflect = getWGSLReflectInfo(code);
            fragment = reflect.entry.fragment[0];
            console.assert(!!fragment, `WGSL着色器 ${code} 中不存在片元入口点。`);
            entryPoint = fragment.name;
        }
        else
        {
            // 验证着色器中包含指定片段入口函数。
            const reflect = getWGSLReflectInfo(code);
            fragment = reflect.entry.fragment.filter((v) => v.name === entryPoint)[0];
            console.assert(!!fragment, `WGSL着色器 ${code} 中不存在指定的片元入口点 ${entryPoint} 。`);
        }
        return entryPoint;
    });

    return result.value;
}


function getGPUBlendState(blend?: BlendState): GPUBlendState
{
    if (!blend) return undefined;

    let result: ComputedRef<GPUBlendState> = blend["_GPUBlendState"];
    if (result) return result.value;

    result = blend["_GPUBlendState"] = computed(() =>
    {
        reactive(blend)?.color;
        reactive(blend)?.alpha;
        //
        const gpuBlend: GPUBlendState = {
            color: getGPUBlendComponent(blend?.color),
            alpha: getGPUBlendComponent(blend?.alpha),
        };
        return gpuBlend;
    })

    return result.value;
}

function getGPUBlendComponent(blendComponent?: BlendComponent): GPUBlendComponent
{
    if (!blendComponent) return { operation: "add", srcFactor: "one", dstFactor: "zero" };

    const result: ComputedRef<GPUBlendComponent> = blendComponent["_GPUBlendComponent"] ??= computed(() =>
    {
        const r_blendComponent = reactive(blendComponent);
        //
        const operation: GPUBlendOperation = r_blendComponent?.operation ?? "add";
        let srcFactor: GPUBlendFactor = r_blendComponent?.srcFactor ?? "one";
        let dstFactor: GPUBlendFactor = r_blendComponent?.dstFactor ?? "zero";
        if (operation === "max" || operation === "min")
        {
            srcFactor = dstFactor = "one";
        }

        const gpuBlendComponent: GPUBlendComponent = {
            operation,
            srcFactor,
            dstFactor,
        };
        return gpuBlendComponent;
    });

    return result.value;
}

function getGPUColorWriteFlags(writeMask?: WriteMask)
{
    if (!writeMask) return 15;

    const result: ComputedRef<GPUColorWriteFlags> = writeMask["_GPUColorWriteFlags"] ??= computed(() =>
    {
        const r_writeMask = reactive(writeMask);
        //
        let gpuWriteMask: GPUColorWriteFlags = 0;
        if (r_writeMask[0])
        {
            gpuWriteMask += 1;
        }
        if (r_writeMask[1])
        {
            gpuWriteMask += 2;
        }
        if (r_writeMask[2])
        {
            gpuWriteMask += 4;
        }
        if (r_writeMask[3])
        {
            gpuWriteMask += 8;
        }

        return gpuWriteMask;
    });

    return result.value;
}

function getWGSLType(type: TypeInfo)
{
    let wgslType = type.name;
    if (isTemplateType(type))
    {
        wgslType += `<${type.format.name}>`;
    }
    if (wgslTypeMap[wgslType])
    {
        wgslType = wgslTypeMap[wgslType];
    }

    return wgslType as WGSLVertexType;
}

/**
 * 别名
 */
const wgslTypeMap = {
    vec2u: "vec2<u32>",
    vec3u: "vec3<u32>",
    vec4u: "vec4<u32>",
    vec2i: "vec2<i32>",
    vec3i: "vec3<i32>",
    vec4i: "vec4<i32>",
    vec2f: "vec2<f32>",
    vec3f: "vec3<f32>",
    vec4f: "vec4<f32>",
};

function isTemplateType(type: TypeInfo): type is TemplateInfo
{
    return !!(type as TemplateInfo).format;
}
