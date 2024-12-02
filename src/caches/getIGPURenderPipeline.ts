import { watcher } from "@feng3d/watcher";

import { FunctionInfo, TemplateInfo, TypeInfo } from "wgsl_reflect";
import { IGPUDepthStencilState, IGPUFragmentState, IGPURenderPipeline, IGPUVertexState } from "../data/IGPURenderObject";
import { IGPUVertexAttributes } from "../data/IGPUVertexAttributes";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { IGPUVertexBuffer } from "../internal/IGPUVertexBuffer";
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
export function getIGPURenderPipeline(renderPipeline: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IGPUVertexAttributes)
{
    let result = renderPipelineMap.get([renderPipeline, renderPassFormat._key, vertices]);
    if (!result)
    {
        // 获取完整的顶点阶段描述与顶点缓冲区列表。
        const { gpuVertexState, vertexBuffers } = getIGPUVertexState(renderPipeline.vertex, vertices);

        // 获取片段阶段完整描述。
        const gpuFragmentState = getIGPUFragmentState(renderPipeline.fragment, renderPassFormat.colorFormats);

        // 获取深度模板阶段完整描述。
        const gpuDepthStencilState = getGPUDepthStencilState(renderPipeline.depthStencil, renderPassFormat.depthStencilFormat);

        // 从渲染通道上获取多重采样数量
        const multisample: GPUMultisampleState = {
            ...renderPipeline.multisample,
            count: renderPassFormat.multisample,
        };

        //
        const pipeline: IGPURenderPipeline = {
            ...renderPipeline,
            vertex: gpuVertexState,
            fragment: gpuFragmentState,
            depthStencil: gpuDepthStencilState,
            multisample,
        };

        result = { pipeline, vertexBuffers };
        renderPipelineMap.set([renderPipeline, renderPassFormat._key, vertices], result);
    }

    return result;
}

const renderPipelineMap = new ChainMap<
    [IGPURenderPipeline, string, IGPUVertexAttributes],
    {
        /**
         * GPU渲染管线描述。
         */
        pipeline: IGPURenderPipeline;
        /**
         * GPU渲染时使用的顶点缓冲区列表。
         */
        vertexBuffers: IGPUVertexBuffer[];
    }
>();


/**
 * 获取深度模板阶段完整描述。
 *
 * @param depthStencil 深度模板阶段描述。
 * @param depthStencilFormat 深度模板附件纹理格式。
 * @returns 深度模板阶段完整描述。
 */
function getGPUDepthStencilState(depthStencil: IGPUDepthStencilState, depthStencilFormat?: GPUTextureFormat)
{
    if (!depthStencilFormat) return undefined;
    //
    const depthWriteEnabled = depthStencil?.depthWriteEnabled ?? true;
    const depthCompare = depthStencil?.depthCompare ?? "less";

    const gpuDepthStencilState = {
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
function getIGPUVertexState(vertexState: IGPUVertexState, vertices: IGPUVertexAttributes)
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

        const { vertexBufferLayouts, vertexBuffers } = getVertexBuffers(vertex, vertices);

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

const vertexStateMap = new ChainMap<[IGPUVertexState, IGPUVertexAttributes], {
    gpuVertexState: NGPUVertexState;
    vertexBuffers: IGPUVertexBuffer[];
}>();

/**
 * 从顶点属性信息与顶点数据中获取顶点缓冲区布局数组以及顶点缓冲区数组。
 *
 * @param vertex 顶点着色器函数信息。
 * @param vertices 顶点数据。
 * @returns 顶点缓冲区布局数组以及顶点缓冲区数组。
 */
function getVertexBuffers(vertex: FunctionInfo, vertices: IGPUVertexAttributes)
{
    const vertexBufferLayouts: GPUVertexBufferLayout[] = [];

    const vertexBuffers: IGPUVertexBuffer[] = [];

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
        let attributeOffset = vertexAttribute.offset || 0;
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

            vertexBuffers[index] = { data: data, offset: data.byteOffset, size: data.byteLength };

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
function getIGPUFragmentState(fragmentState: IGPUFragmentState, colorAttachments: readonly GPUTextureFormat[])
{
    if (!fragmentState) return undefined;

    const colorAttachmentsKey = colorAttachments.toString();

    let gpuFragmentState = fragmentStateMap.get([fragmentState, colorAttachmentsKey]);
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

        const targets = colorAttachments.map((v, i) =>
        {
            if (!v) return undefined;

            const gpuColorTargetState: GPUColorTargetState = { format: v };

            const colorTargetState = fragmentState.targets?.[i];
            if (colorTargetState)
            {
                Object.assign(gpuColorTargetState, colorTargetState);
            }

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

const fragmentStateMap = new ChainMap<[IGPUFragmentState, string], IGPUFragmentState>();

function getWGSLType(type: TypeInfo)
{
    let wgslType = type.name;
    if (isTemplateType(type))
    {
        wgslType += `<${type.format.name}>`;
    }
    if (wgslTypeMap[wgslType])
    {
        wgslType = wgslTypeMap[wgslType]
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
