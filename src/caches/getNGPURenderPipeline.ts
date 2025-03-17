import { BlendState, ChainMap, ColorTargetState, computed, ComputedRef, DepthStencilState, FragmentState, IIndicesDataTypes, IWriteMask, PrimitiveState, reactive, RenderPipeline, StencilFaceState, VertexAttributes, vertexFormatMap, VertexState, WGSLVertexType } from "@feng3d/render-api";
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
export function getNGPURenderPipeline(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, primitive: PrimitiveState, vertices: VertexAttributes, indices: IIndicesDataTypes)
{
    const indexFormat = indices ? (indices.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16") : undefined;

    let result = device._renderPipelineMap.get([renderPipeline, renderPassFormat._key, primitive, vertices, indexFormat]);
    if (result) return result;

    const gpuPrimitive = getGPUPrimitiveState(primitive, indexFormat);

    // 获取完整的顶点阶段描述与顶点缓冲区列表。
    const vertexStateResult = getNGPUVertexState(device, renderPipeline.vertex, vertices);

    // 获取深度模板阶段完整描述。
    const gpuDepthStencilState = getGPUDepthStencilState(renderPipeline.depthStencil, renderPassFormat.depthStencilFormat);

    // 从渲染通道上获取多重采样数量
    const gpuMultisampleState = getGPUMultisampleState(renderPipeline.multisample, renderPassFormat.sampleCount);

    // 从GPU管线中获取管线布局。
    const layout = getGPUPipelineLayout(device, renderPipeline);

    const gpuFragmentState = computed(() =>
    {
        // 获取片段阶段完整描述。
        reactive(renderPipeline).fragment;

        const fragment = renderPipeline.fragment;
        if (!fragment) return undefined;

        return getGPUFragmentState(device, renderPipeline.fragment, renderPassFormat.colorFormats);
    });

    const gpuRenderPipeline = computed(() =>
    {
        //
        const gpuRenderPipelineDescriptor: GPURenderPipelineDescriptor = {
            label: renderPipeline.label,
            layout,
            vertex: vertexStateResult.gpuVertexState,
            fragment: gpuFragmentState.value,
            primitive: gpuPrimitive,
            depthStencil: gpuDepthStencilState,
            multisample: gpuMultisampleState,
        };

        const gpuRenderPipeline = device.createRenderPipeline(gpuRenderPipelineDescriptor);

        return gpuRenderPipeline;
    });

    result = { _version: 0, pipeline: gpuRenderPipeline, vertexBuffers: vertexStateResult.vertexBuffers };
    device._renderPipelineMap.set([renderPipeline, renderPassFormat._key, primitive, vertices, indexFormat], result);

    // 监听管线变化
    const onchanged = () =>
    {
        result._version++;
        renderPipeline._version = ~~renderPipeline._version + 1;
        device._renderPipelineMap.delete([renderPipeline, renderPassFormat._key, primitive, vertices, indexFormat]);
        watcher.unwatch(vertexStateResult, "_version", onchanged);
    }
    watcher.watch(vertexStateResult, "_version", onchanged);

    return result;
}

function getGPUPrimitiveState(primitive?: PrimitiveState, indexFormat?: GPUIndexFormat)
{
    let stripIndexFormat: GPUIndexFormat;
    if (primitive?.topology === "triangle-strip" || primitive?.topology === "line-strip")
    {
        stripIndexFormat = indexFormat;
    }

    const topology: GPUPrimitiveTopology = primitive?.topology || "triangle-list";
    const cullMode: GPUCullMode = primitive?.cullFace || "none";
    const frontFace: GPUFrontFace = primitive?.frontFace || "ccw";
    const unclippedDepth: boolean = primitive?.unclippedDepth || false;

    //
    const gpuPrimitive: GPUPrimitiveState = {
        topology,
        stripIndexFormat,
        frontFace,
        cullMode,
        unclippedDepth,
    };

    return gpuPrimitive;
}

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
    //
    const gpuDepthStencilState: GPUDepthStencilState = {
        format: depthStencilFormat,
        depthWriteEnabled: depthStencil?.depthWriteEnabled ?? true,
        depthCompare: depthStencil?.depthCompare ?? "less",
        stencilFront: getGPUStencilFaceState(depthStencil?.stencilFront),
        stencilBack: getGPUStencilFaceState(depthStencil?.stencilBack),
        stencilReadMask: depthStencil?.stencilReadMask ?? 0xFFFFFFFF,
        stencilWriteMask: depthStencil?.stencilWriteMask ?? 0xFFFFFFFF,
        depthBias: depthStencil?.depthBias ?? 0,
        depthBiasSlopeScale: depthStencil?.depthBiasSlopeScale ?? 0,
        depthBiasClamp: depthStencil?.depthBiasClamp ?? 0,
    };

    return gpuDepthStencilState;
}

function getGPUStencilFaceState(stencilFaceState?: StencilFaceState)
{
    if (!stencilFaceState) return {};

    const gpuStencilFaceState: GPUStencilFaceState = {
        compare: stencilFaceState.compare ?? "always",
        failOp: stencilFaceState.failOp ?? "keep",
        depthFailOp: stencilFaceState.depthFailOp ?? "keep",
        passOp: stencilFaceState.passOp ?? "keep",
    };

    return gpuStencilFaceState;
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

    const code = vertexState.code;

    // 解析顶点着色器
    const reflect = getWGSLReflectInfo(code);
    let vertex: FunctionInfo;
    //
    let entryPoint = vertexState.entryPoint;
    if (!entryPoint)
    {
        console.assert(!!reflect.entry.vertex[0], `WGSL着色器 ${code} 中不存在顶点入口点。`);
        entryPoint = reflect.entry.vertex[0].name;
    }

    vertex = reflect.entry.vertex.filter((v) => v.name === entryPoint)[0];
    console.assert(!!vertex, `WGSL着色器 ${code} 中不存在顶点入口点 ${entryPoint} 。`);

    const { vertexBufferLayouts, vertexBuffers } = getNGPUVertexBuffers(vertex, vertices);

    const gpuVertexState: GPUVertexState = {
        module: getGPUShaderModule(device, vertexState.code),
        entryPoint,
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
    //
    const writeMask = getGPUColorWriteFlags(colorTargetState?.writeMask);

    const blend = getGPUBlendState(colorTargetState?.blend);

    //
    const gpuColorTargetState: GPUColorTargetState = {
        format,
        blend,
        writeMask,
    };

    return gpuColorTargetState;
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
    let gpuFragmentState = fragmentStateMap.get([fragmentState, colorAttachments]);
    if (gpuFragmentState) return gpuFragmentState.value;

    const targets = computed(() =>
    {
        reactive(fragmentState).targets;

        return colorAttachments.map((format, i) =>
        {
            if (!format) return undefined;

            //
            reactive(fragmentState).targets?.[i];
            const gpuColorTargetState = getGPUColorTargetState(fragmentState.targets?.[i], format);

            return gpuColorTargetState;
        });
    });

    const entryPoint = computed(() => 
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

    const module = computed(() =>
    {
        // 监听着色器代码变化
        reactive(fragmentState).code;

        return getGPUShaderModule(device, fragmentState.code);
    });

    gpuFragmentState = computed(() =>
    {
        return {
            module: module.value,
            entryPoint: entryPoint.value,
            targets: targets.value,
            constants: fragmentState.constants
        } as GPUFragmentState;
    });

    fragmentStateMap.set([fragmentState, colorAttachments], gpuFragmentState);

    return gpuFragmentState.value;
}

const fragmentStateMap = new ChainMap<[FragmentState, readonly GPUTextureFormat[]], ComputedRef<GPUFragmentState>>();


function getGPUBlendState(blend?: BlendState): GPUBlendState
{
    if (!blend) return undefined;

    let result: ComputedRef<GPUBlendState> = blend["_GPUBlendState"];
    if (result) return result.value;

    result = blend["_GPUBlendState"] = computed(() =>
    {
        const r_blend = reactive(blend);
        //
        const colorOperation: GPUBlendOperation = r_blend?.color?.operation || "add";
        let colorSrcFactor: GPUBlendFactor = r_blend?.color?.srcFactor || "one";
        let colorDstFactor: GPUBlendFactor = r_blend?.color?.dstFactor || "zero";
        if (colorOperation === "max" || colorOperation === "min")
        {
            colorSrcFactor = colorDstFactor = "one";
        }
        //
        const alphaOperation: GPUBlendOperation = r_blend?.alpha?.operation || colorOperation;
        let alphaSrcFactor: GPUBlendFactor = r_blend?.alpha?.srcFactor || colorSrcFactor;
        let alphaDstFactor: GPUBlendFactor = r_blend?.alpha?.dstFactor || colorDstFactor;
        if (alphaOperation === "max" || alphaOperation === "min")
        {
            alphaSrcFactor = alphaDstFactor = "one";
        }

        const gpuBlend: GPUBlendState = {
            color: {
                operation: colorOperation,
                srcFactor: colorSrcFactor,
                dstFactor: colorDstFactor,
            },
            alpha: {
                operation: alphaOperation,
                srcFactor: alphaSrcFactor,
                dstFactor: alphaDstFactor,
            },
        };
        return gpuBlend;
    })

    return result.value;
}

function getGPUColorWriteFlags(writeMask?: IWriteMask)
{
    if (!writeMask) return 15;

    let gpuWriteMask: GPUColorWriteFlags = 0;
    if (writeMask[0])
    {
        gpuWriteMask += 1;
    }
    if (writeMask[1])
    {
        gpuWriteMask += 2;
    }
    if (writeMask[2])
    {
        gpuWriteMask += 4;
    }
    if (writeMask[3])
    {
        gpuWriteMask += 8;
    }

    return gpuWriteMask;
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
