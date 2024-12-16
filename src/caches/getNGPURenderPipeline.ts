import { getBlendConstantColor, IBlendState, IDepthStencilState, IFragmentState, IIndicesDataTypes, IPrimitiveState, IRenderPipeline, IVertexAttributes, IVertexState, IWriteMask } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { FunctionInfo, TemplateInfo, TypeInfo } from "wgsl_reflect";

import { IGPUMultisampleState } from "../data/IGPUMultisampleState";
import { getIGPUIndexBuffer } from "../internal/getIGPUIndexBuffer";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { NGPUFragmentState } from "../internal/NGPUFragmentState";
import { NGPURenderPipeline } from "../internal/NGPURenderPipeline";
import { NGPUVertexBuffer } from "../internal/NGPUVertexBuffer";
import { NGPUVertexState } from "../internal/NGPUVertexState";
import { gpuVertexFormatMap, WGSLVertexType } from "../types/VertexFormat";
import { ChainMap } from "../utils/ChainMap";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *
 * @param renderPipeline 渲染管线描述。
 * @param renderPass 渲染通道描述。
 * @param vertices 顶点属性数据映射。
 * @returns 完整的渲染管线描述以及顶点缓冲区数组。
 */
export function getNGPURenderPipeline(renderPipeline: IRenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IVertexAttributes, indices: IIndicesDataTypes)
{
    const indexFormat = indices ? getIGPUIndexBuffer(indices).indexFormat : undefined;

    let result = renderPipelineMap.get([renderPipeline, renderPassFormat._key, vertices, indexFormat]);
    if (!result)
    {
        const { label, primitive } = renderPipeline;

        const gpuPrimitive = getGPUPrimitiveState(primitive, indexFormat);

        // 获取完整的顶点阶段描述与顶点缓冲区列表。
        const { gpuVertexState, vertexBuffers } = getNGPUVertexState(renderPipeline.vertex, vertices);

        // 获取片段阶段完整描述。
        const gpuFragmentState = getNGPUFragmentState(renderPipeline.fragment, renderPassFormat.colorFormats);

        // 获取深度模板阶段完整描述。
        const gpuDepthStencilState = getGPUDepthStencilState(renderPipeline.depthStencil, renderPassFormat.depthStencilFormat);

        // 从渲染通道上获取多重采样数量
        const gpuMultisampleState = getGPUMultisampleState(renderPipeline.multisample, renderPassFormat.sampleCount);

        // 
        const stencilReference = getStencilReference(renderPipeline.depthStencil);
        // 
        const blendConstantColor = getBlendConstantColor(renderPipeline.fragment?.targets?.[0]?.blend)

        //
        const pipeline: NGPURenderPipeline = {
            label,
            primitive: gpuPrimitive,
            vertex: gpuVertexState,
            fragment: gpuFragmentState,
            depthStencil: gpuDepthStencilState,
            multisample: gpuMultisampleState,
            stencilReference,
            blendConstantColor,
        };

        result = { pipeline, vertexBuffers };
        renderPipelineMap.set([renderPipeline, renderPassFormat._key, vertices, indexFormat], result);
    }

    return result;
}

const renderPipelineMap = new ChainMap<
    [IRenderPipeline, string, IVertexAttributes, GPUIndexFormat],
    {
        /**
         * GPU渲染管线描述。
         */
        pipeline: NGPURenderPipeline;
        /**
         * GPU渲染时使用的顶点缓冲区列表。
         */
        vertexBuffers: NGPUVertexBuffer[];
    }
>();

/**
 * 如果任意模板测试结果使用了 "replace" 运算，则需要再渲染前设置 `stencilReference` 值。
 * 
 * @param depthStencil 
 * @returns 
 */
function getStencilReference(depthStencil?: IDepthStencilState)
{
    if (!depthStencil) return undefined;

    const { stencilFront, stencilBack } = depthStencil;

    // 如果开启了模板测试，则需要设置模板索引值
    let stencilReference: number;
    if (stencilFront)
    {
        const { failOp, depthFailOp, passOp } = stencilFront;
        if (failOp === "replace" || depthFailOp === "replace" || passOp === "replace")
        {
            stencilReference = depthStencil?.stencilReference ?? 0;
        }
    }
    if (stencilBack)
    {
        const { failOp, depthFailOp, passOp } = stencilBack;
        if (failOp === "replace" || depthFailOp === "replace" || passOp === "replace")
        {
            stencilReference = depthStencil?.stencilReference ?? 0;
        }
    }

    return stencilReference;
}

function getGPUPrimitiveState(primitive?: IPrimitiveState, indexFormat?: GPUIndexFormat)
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
        ...primitive,
        topology,
        stripIndexFormat,
        frontFace,
        cullMode,
        unclippedDepth,
    };
    return gpuPrimitive;
}

function getGPUMultisampleState(multisampleState?: IGPUMultisampleState, sampleCount?: 4)
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
function getGPUDepthStencilState(depthStencil: IDepthStencilState, depthStencilFormat?: GPUTextureFormat)
{
    if (!depthStencilFormat) return undefined;
    //
    const depthWriteEnabled = depthStencil?.depthWriteEnabled ?? false;
    const depthCompare = depthStencil?.depthCompare ?? "less";

    const gpuDepthStencilState: GPUDepthStencilState = {
        ...depthStencil,
        depthWriteEnabled,
        depthCompare,
        format: depthStencilFormat,
    };

    return gpuDepthStencilState;
}

/**
 * 获取完整的顶点阶段描述与顶点缓冲区列表。
 *
 * @param vertexState 顶点阶段信息。
 * @param vertices 顶点数据。
 * @returns 完整的顶点阶段描述与顶点缓冲区列表。
 */
function getNGPUVertexState(vertexState: IVertexState, vertices: IVertexAttributes)
{
    let result = vertexStateMap.get([vertexState, vertices]);
    if (!result)
    {
        const code = vertexState.code;

        // 解析顶点着色器
        const reflect = getWGSLReflectInfo(code);
        let vertex: FunctionInfo;
        //
        let entryPoint = vertexState.entryPoint;
        if (!entryPoint)
        {
            vertex = reflect.entry.vertex[0];
            console.assert(!!vertex, `WGSL着色器 ${code} 中不存在顶点入口点。`);
            entryPoint = vertex.name;
        }
        else
        {
            vertex = reflect.entry.vertex.filter((v) => v.name === entryPoint)[0];
            console.assert(!!vertex, `WGSL着色器 ${code} 中不存在指定顶点入口点 ${entryPoint} 。`);
        }

        const { vertexBufferLayouts, vertexBuffers } = getNGPUVertexBuffers(vertex, vertices);

        const gpuVertexState: NGPUVertexState = {
            code,
            entryPoint,
            buffers: vertexBufferLayouts,
            constants: vertexState.constants,
        };

        result = { gpuVertexState, vertexBuffers };
        vertexStateMap.set([vertexState, vertices], result);
    }

    return result;
}

const vertexStateMap = new ChainMap<[IVertexState, IVertexAttributes], {
    gpuVertexState: NGPUVertexState;
    vertexBuffers: NGPUVertexBuffer[];
}>();

/**
 * 从顶点属性信息与顶点数据中获取顶点缓冲区布局数组以及顶点缓冲区数组。
 *
 * @param vertex 顶点着色器函数信息。
 * @param vertices 顶点数据。
 * @returns 顶点缓冲区布局数组以及顶点缓冲区数组。
 */
function getNGPUVertexBuffers(vertex: FunctionInfo, vertices: IVertexAttributes)
{
    const vertexBufferLayouts: GPUVertexBufferLayout[] = [];

    const vertexBuffers: NGPUVertexBuffer[] = [];

    const map: WeakMap<any, number> = new WeakMap();

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
        console.assert(data.constructor.name === gpuVertexFormatMap[format].typedArrayConstructor.name,
            `顶点${attributeName} 提供的数据类型 ${data.constructor.name} 与格式 ${format} 不匹配！请使用 ${data.constructor.name} 来组织数据或者更改数据格式。`);

        // 如果 偏移值大于 单个顶点尺寸，则该值被放入 IGPUVertexBuffer.offset。
        const vertexByteSize = gpuVertexFormatMap[format].byteSize;
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

/**
 * 获取片段阶段完整描述。
 *
 * @param fragmentState 片段简单阶段。
 * @param colorAttachmentTextureFormats 颜色附件格式。
 * @returns 片段阶段完整描述。
 */
function getNGPUFragmentState(fragmentState: IFragmentState, colorAttachments: readonly GPUTextureFormat[])
{
    if (!fragmentState) return undefined;

    const colorAttachmentsKey = colorAttachments.toString();

    let gpuFragmentState: NGPUFragmentState = fragmentStateMap.get([fragmentState, colorAttachmentsKey]);
    if (!gpuFragmentState)
    {
        const code = fragmentState.code;
        let entryPoint = fragmentState.entryPoint;
        let fragment: FunctionInfo;
        const reflect = getWGSLReflectInfo(code);
        if (!entryPoint)
        {
            fragment = reflect.entry.fragment[0];
            console.assert(!!fragment, `WGSL着色器 ${code} 中不存在片元入口点。`);
            entryPoint = fragment.name;
        }
        else
        {
            // 验证着色器中包含指定片段入口函数。
            fragment = reflect.entry.fragment.filter((v) => v.name === entryPoint)[0];
            console.assert(!!fragment, `WGSL着色器 ${code} 中不存在指定的片元入口点 ${entryPoint} 。`);
        }

        const targets = colorAttachments.map((format, i) =>
        {
            if (!format) return undefined;

            const colorTargetState = fragmentState.targets?.[i];

            //
            const writeMask = getGPUColorWriteFlags(colorTargetState?.writeMask);

            const blend: GPUBlendState = getGPUBlendState(colorTargetState?.blend);

            //
            const gpuColorTargetState: GPUColorTargetState = {
                format,
                blend,
                writeMask,
            };

            return gpuColorTargetState;
        });

        gpuFragmentState = {
            code,
            entryPoint,
            targets,
            constants: fragmentState.constants
        };

        fragmentStateMap.set([fragmentState, colorAttachmentsKey], gpuFragmentState);
    }

    return gpuFragmentState;
}

const fragmentStateMap = new ChainMap<[IFragmentState, string], NGPUFragmentState>();

function getGPUBlendState(blend?: IBlendState): GPUBlendState
{
    if (!blend) undefined;

    //
    const colorOperation: GPUBlendOperation = blend?.color?.operation || "add";
    let colorSrcFactor: GPUBlendFactor = blend?.color?.srcFactor || "one";
    let colorDstFactor: GPUBlendFactor = blend?.color?.dstFactor || "zero";
    if (colorOperation === "max" || colorOperation === "min")
    {
        colorSrcFactor = colorDstFactor = "one";
    }
    //
    const alphaOperation: GPUBlendOperation = blend?.alpha?.operation || colorOperation;
    let alphaSrcFactor: GPUBlendFactor = blend?.alpha?.srcFactor || colorSrcFactor;
    let alphaDstFactor: GPUBlendFactor = blend?.alpha?.dstFactor || colorDstFactor;
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
