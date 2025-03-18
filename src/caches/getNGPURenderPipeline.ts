import { BlendComponent, BlendState, ColorTargetState, computed, ComputedRef, DepthStencilState, FragmentState, IIndicesDataTypes, PrimitiveState, reactive, RenderPipeline, StencilFaceState, VertexAttributes, WGSLVertexType, WriteMask } from "@feng3d/render-api";
import { TemplateInfo, TypeInfo } from "wgsl_reflect";

import { MultisampleState } from "../data/MultisampleState";
import { RenderPassFormat } from "../internal/RenderPassFormat";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getNGPUVertexState } from "./getNGPUVertexState";
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
    if (result) return result.value;

    result = computed(() =>
    {
        // 监听
        const r_renderPipeline = reactive(renderPipeline);
        r_renderPipeline.label;
        r_renderPipeline.fragment;
        r_renderPipeline.primitive;
        r_renderPipeline.depthStencil;
        // r_renderPipeline.vertex
        r_renderPipeline.vertex.code;
        // r_renderPipeline.fragment
        r_renderPipeline.fragment?.code
        r_renderPipeline.multisample

        // 计算
        const { label, vertex, fragment, primitive, depthStencil, multisample } = renderPipeline;
        const shader = { vertex: vertex.code, fragment: fragment?.code };
        const { colorFormats, depthStencilFormat, sampleCount } = renderPassFormat;
        const gpuVertexState = getNGPUVertexState(device, vertex, vertices);
        //
        const gpuRenderPipelineDescriptor: GPURenderPipelineDescriptor = {
            label: label,
            layout: getGPUPipelineLayout(device, shader),
            vertex: gpuVertexState,
            fragment: getGPUFragmentState(device, fragment, colorFormats),
            primitive: getGPUPrimitiveState(primitive, indexFormat),
            depthStencil: getGPUDepthStencilState(depthStencil, depthStencilFormat),
            multisample: getGPUMultisampleState(multisample, sampleCount),
        };

        const gpuRenderPipeline = device.createRenderPipeline(gpuRenderPipelineDescriptor);

        return gpuRenderPipeline;
    });
    device._renderPipelineMap.set([renderPipeline, renderPassFormat._key, vertices, indexFormat], result);

    return result.value;
}

function getGPUPrimitiveState(primitive?: PrimitiveState, indexFormat?: GPUIndexFormat): GPUPrimitiveState
{
    if (!primitive) return defaultGPUPrimitiveState;

    const result: ComputedRef<GPUPrimitiveState> = primitive["_cache_GPUPrimitiveState_" + indexFormat] ??= computed(() =>
    {
        // 监听
        const r_primitive = reactive(primitive);
        r_primitive.topology;
        r_primitive.cullFace;
        r_primitive.frontFace;
        r_primitive.unclippedDepth;

        // 计算
        const { topology, cullFace, frontFace, unclippedDepth } = primitive;
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

    const result: ComputedRef<GPUMultisampleState> = multisampleState["_cache_GPUMultisampleState_" + sampleCount] ??= computed(() =>
    {
        // 监听
        const r_multisampleState = reactive(multisampleState);
        r_multisampleState.mask;
        r_multisampleState.alphaToCoverageEnabled;

        // 计算
        const { mask, alphaToCoverageEnabled } = multisampleState;
        const gpuMultisampleState: GPUMultisampleState = {
            count: sampleCount,
            mask: mask ?? 0xFFFFFFFF,
            alphaToCoverageEnabled: alphaToCoverageEnabled ?? false,
        };

        return gpuMultisampleState;
    });

    return result.value;
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
        // 监听
        const r_depthStencil = reactive(depthStencil);
        r_depthStencil.depthWriteEnabled;
        r_depthStencil.depthCompare;
        r_depthStencil.stencilFront;
        r_depthStencil.stencilBack;
        r_depthStencil.stencilReadMask;
        r_depthStencil.stencilWriteMask;
        r_depthStencil.depthBias;
        r_depthStencil.depthBiasSlopeScale;
        r_depthStencil.depthBiasClamp;

        // 计算
        const { depthWriteEnabled, depthCompare, stencilFront, stencilBack, stencilReadMask, stencilWriteMask, depthBias, depthBiasSlopeScale, depthBiasClamp } = depthStencil;
        const gpuDepthStencilState: GPUDepthStencilState = {
            format: depthStencilFormat,
            depthWriteEnabled: depthWriteEnabled ?? true,
            depthCompare: depthCompare ?? "less",
            stencilFront: getGPUStencilFaceState(stencilFront),
            stencilBack: getGPUStencilFaceState(stencilBack),
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
        // 监听
        const r_stencilFaceState = reactive(stencilFaceState);
        r_stencilFaceState.compare;
        r_stencilFaceState.failOp;
        r_stencilFaceState.depthFailOp;
        r_stencilFaceState.passOp;

        // 计算
        const { compare, failOp, depthFailOp, passOp } = stencilFaceState;
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

function getGPUColorTargetState(colorTargetState: ColorTargetState, format: GPUTextureFormat)
{
    if (!colorTargetState) return defaultGPUColorTargetState(format);

    const result: ComputedRef<GPUColorTargetState> = colorTargetState["_GPUColorTargetState_" + format] ??= computed(() =>
    {
        // 监听
        const r_colorTargetState = reactive(colorTargetState);
        r_colorTargetState.writeMask;
        r_colorTargetState.blend;

        // 计算
        const { writeMask, blend } = colorTargetState;
        const gpuColorTargetState: GPUColorTargetState = {
            format,
            blend: getGPUBlendState(blend),
            writeMask: getGPUColorWriteFlags(writeMask),
        };

        return gpuColorTargetState;
    });

    return result.value;
}

const _defaultGPUColorTargetState = {};
const defaultGPUColorTargetState = (format: GPUTextureFormat) =>
{
    return _defaultGPUColorTargetState[format] ??= { format, blend: getGPUBlendState(undefined), writeMask: getGPUColorWriteFlags(undefined) }
};

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
        // 监听
        const r_fragmentState = reactive(fragmentState);
        r_fragmentState.code;
        r_fragmentState.targets;
        for (const key in r_fragmentState.constants) { r_fragmentState.constants[key]; }

        // 计算
        const { code, targets, constants } = fragmentState;
        return {
            module: getGPUShaderModule(device, code),
            entryPoint: getEntryPoint(fragmentState),
            targets: getGPUColorTargetStates(targets, colorAttachments),
            constants: constants
        } as GPUFragmentState;
    });

    device._fragmentStateMap.set([fragmentState, colorAttachmentsKey], gpuFragmentState);

    return gpuFragmentState.value;
}

function getGPUColorTargetStates(targets: readonly ColorTargetState[], colorAttachments: readonly GPUTextureFormat[]): GPUColorTargetState[]
{
    if (!targets) return defaultGPUColorTargetStates(colorAttachments);

    const result: ComputedRef<GPUColorTargetState[]> = targets["_GPUColorTargetStates_" + colorAttachments.toString()] ??= computed(() =>
    {
        return colorAttachments.map((format, i) =>
        {
            if (!format) return undefined;

            // 监听
            reactive(targets)[i];

            // 计算
            const gpuColorTargetState = getGPUColorTargetState(targets[i], format);

            return gpuColorTargetState;
        });
    });

    return result.value;
}
const _defaultGPUColorTargetStates: { [key: string]: GPUColorTargetState[] } = {};
const defaultGPUColorTargetStates = (colorAttachments: readonly GPUTextureFormat[]) =>
{
    return _defaultGPUColorTargetStates[colorAttachments.toString()] ??= colorAttachments.map((format) =>
    {
        return getGPUColorTargetState(undefined, format);
    });
};

function getEntryPoint(fragmentState: FragmentState)
{
    const result: ComputedRef<string> = fragmentState["_entryPoint"] ??= computed(() =>
    {
        // 监听
        const r_fragmentState = reactive(fragmentState);
        r_fragmentState.entryPoint;
        r_fragmentState.code;

        // 计算
        const { entryPoint, code } = fragmentState;
        //
        if (entryPoint) return entryPoint;
        const reflect = getWGSLReflectInfo(code);
        const fragment = reflect.entry.fragment[0];
        console.assert(!!fragment, `WGSL着色器 ${code} 中不存在片元入口点。`);

        return fragment.name;
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
        // 监听
        const r_blend = reactive(blend);
        r_blend.color;
        r_blend.alpha;
        // 计算
        const { color, alpha } = blend;
        const gpuBlend: GPUBlendState = {
            color: getGPUBlendComponent(color),
            alpha: getGPUBlendComponent(alpha),
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
        // 监听
        const r_blendComponent = reactive(blendComponent);
        r_blendComponent.operation;
        r_blendComponent.srcFactor;
        r_blendComponent.dstFactor;

        // 计算
        const { operation, srcFactor, dstFactor } = blendComponent;
        // 当 operation 为 max 或 min 时，srcFactor 和 dstFactor 必须为 one。
        const gpuBlendComponent: GPUBlendComponent = {
            operation: operation ?? "add",
            srcFactor: (operation === "max" || operation === "min") ? "one" : (srcFactor ?? "one"),
            dstFactor: (operation === "max" || operation === "min") ? "one" : (dstFactor ?? "zero"),
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
        // 监听
        const r_writeMask = reactive(writeMask);
        r_writeMask[0];
        r_writeMask[1];
        r_writeMask[2];
        r_writeMask[3];

        // 计算
        const [red, green, blue, alpha] = writeMask;
        let gpuWriteMask: GPUColorWriteFlags = 0;
        if (red)
        {
            gpuWriteMask += 1;
        }
        if (green)
        {
            gpuWriteMask += 2;
        }
        if (blue)
        {
            gpuWriteMask += 4;
        }
        if (alpha)
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
