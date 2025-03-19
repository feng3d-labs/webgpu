import { BlendComponent, BlendState, ChainMap, ColorTargetState, computed, ComputedRef, DepthStencilState, FragmentState, PrimitiveState, reactive, RenderPipeline, StencilFaceState, VertexAttributes, VertexState, WGSLVertexType, WriteMask } from "@feng3d/render-api";
import { TemplateInfo, TypeInfo } from "wgsl_reflect";

import { MultisampleState } from "../data/MultisampleState";
import { RenderPassFormat } from "../internal/RenderPassFormat";
import { getGPUPipelineLayout } from "./getGPUPipelineLayout";
import { getGPUShaderModule } from "./getGPUShaderModule";
import { getGPUVertexBufferLayouts } from "./getNGPUVertexBuffers";
import { getVertexEntryFunctionInfo } from "./getVertexEntryFunctionInfo";
import { getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *
 * @param renderPipeline 渲染管线描述。
 * @param renderPass 渲染通道描述。
 * @param vertices 顶点属性数据映射。
 * @returns 完整的渲染管线描述以及顶点缓冲区数组。
 */
export function getGPURenderPipeline(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat)
{
    const getGPURenderPipelineKey: GetGPURenderPipelineKey = [device, renderPipeline, renderPassFormat._key, vertices, indexFormat];
    let result = getGPURenderPipelineMap.get(getGPURenderPipelineKey);
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
        const gpuVertexState = getGPUVertexState(device, vertex, vertices);
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
    getGPURenderPipelineMap.set(getGPURenderPipelineKey, result);

    return result.value;
}
type GetGPURenderPipelineKey = [device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormatKey: string, vertices: VertexAttributes, indexFormat: GPUIndexFormat];
const getGPURenderPipelineMap = new ChainMap<GetGPURenderPipelineKey, ComputedRef<GPURenderPipeline>>;

/**
 * 获取完整的顶点阶段描述与顶点缓冲区列表。
 *
 * @param vertexState 顶点阶段信息。
 * @param vertices 顶点数据。
 * @returns 完整的顶点阶段描述与顶点缓冲区列表。
 */
function getGPUVertexState(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
{
    const getGPUVertexStateKey: GetGPUVertexStateKey = [device, vertexState, vertices];
    const result = getGPUVertexStateMap.get(getGPUVertexStateKey);
    if (result) return result.value;

    return getGPUVertexStateMap.set(getGPUVertexStateKey, computed(() =>
    {
        // 监听
        const r_vertexState = reactive(vertexState);
        r_vertexState.code;
        r_vertexState.constants;

        // 计算
        const { code, constants } = vertexState;

        const vertexEntryFunctionInfo = getVertexEntryFunctionInfo(vertexState);
        const vertexBufferLayouts = getGPUVertexBufferLayouts(vertexState, vertices);

        const gpuVertexState: GPUVertexState = {
            module: getGPUShaderModule(device, code),
            entryPoint: vertexEntryFunctionInfo.name,
            buffers: vertexBufferLayouts,
            constants: getConstants(constants),
        };

        // 缓存
        const gpuVertexStateKey: GPUVertexStateKey = [gpuVertexState.module, gpuVertexState.entryPoint, gpuVertexState.buffers, gpuVertexState.constants];
        const cache = gpuVertexStateMap.get(gpuVertexStateKey);
        if (cache) return cache;
        gpuVertexStateMap.set(gpuVertexStateKey, gpuVertexState);

        return gpuVertexState;
    })).value;
}

type GetGPUVertexStateKey = [device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes];
const getGPUVertexStateMap = new ChainMap<GetGPUVertexStateKey, ComputedRef<GPUVertexState>>();
type GPUVertexStateKey = [module: GPUShaderModule, entryPoint: string, buffers: Iterable<GPUVertexBufferLayout>, constants: Record<string, number>];
const gpuVertexStateMap = new ChainMap<any[], GPUVertexState>();

function getConstants(constants: Record<string, number>)
{
    if (!constants) return undefined;

    let result: ComputedRef<Record<string, number>> = getConstantsMap.get(constants);
    if (result) return result.value;

    result = computed(() =>
    {
        const r_constants = reactive(constants);

        let constantsKey = "";
        for (const key in r_constants)
        {
            constantsKey += `${key}:${r_constants[key]},`;
        }

        if (constantsMap[constantsKey])
        {
            return constantsMap[constantsKey];
        }
        constantsMap[constantsKey] = constants;

        return constants;
    });
    getConstantsMap.set(constants, result);

    return result.value;
}
const constantsMap: { [constantsKey: string]: Record<string, number> } = {};
const getConstantsMap = new WeakMap<Record<string, number>, ComputedRef<Record<string, number>>>();

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

    if (!depthStencil) return getDefaultGPUDepthStencilState(depthStencilFormat);

    const getGPUDepthStencilStateKey: GetGPUDepthStencilStateKey = [depthStencil, depthStencilFormat];
    let result = getGPUDepthStencilStateMap.get(getGPUDepthStencilStateKey);
    if (result) return result.value;

    result = computed(() =>
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

        // 缓存


        return gpuDepthStencilState;
    });
    getGPUDepthStencilStateMap.set(getGPUDepthStencilStateKey, result);

    return result.value;
}
type GetGPUDepthStencilStateKey = [depthStencil: DepthStencilState, depthStencilFormat: GPUTextureFormat];
const getGPUDepthStencilStateMap = new ChainMap<GetGPUDepthStencilStateKey, ComputedRef<GPUDepthStencilState>>();

/**
 * 获取片段阶段完整描述。
 *
 * @param fragment 片段阶段描述。
 */
function getDefaultGPUDepthStencilState(depthStencilFormat: GPUTextureFormat)
{
    let result = defaultGPUDepthStencilStates[depthStencilFormat];
    if (result) return result;

    result = defaultGPUDepthStencilStates[depthStencilFormat] = { format: depthStencilFormat };

    return result;
}
const defaultGPUDepthStencilStates: Record<GPUTextureFormat, GPUDepthStencilState> = {} as any;

function getGPUStencilFaceState(stencilFaceState?: StencilFaceState)
{
    if (!stencilFaceState) return defaultGPUStencilFaceState;

    let result = getGPUStencilFaceStateMap.get(stencilFaceState);
    if (result) return result.value;

    result = computed(() =>
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

        // 缓存
        const gpuStencilFaceStateKey: GPUStencilFaceStateKey = [gpuStencilFaceState.compare, gpuStencilFaceState.failOp, gpuStencilFaceState.depthFailOp, gpuStencilFaceState.passOp];
        const cache = GPUStencilFaceStateMap.get(gpuStencilFaceStateKey);
        if (cache) return cache;
        GPUStencilFaceStateMap.set(gpuStencilFaceStateKey, gpuStencilFaceState);

        //
        return gpuStencilFaceState;
    });
    getGPUStencilFaceStateMap.set(stencilFaceState, result);

    return result.value;
}
const defaultGPUStencilFaceState: GPUStencilFaceState = {};
const getGPUStencilFaceStateMap = new WeakMap<StencilFaceState, ComputedRef<GPUStencilFaceState>>();
type GPUStencilFaceStateKey = [compare: GPUCompareFunction, failOp: GPUStencilOperation, depthFailOp: GPUStencilOperation, passOp: GPUStencilOperation];
const GPUStencilFaceStateMap = new ChainMap<GPUStencilFaceStateKey, GPUStencilFaceState>();

function getGPUColorTargetState(colorTargetState: ColorTargetState, format: GPUTextureFormat)
{
    if (!colorTargetState) return getDefaultGPUColorTargetState(format);

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

const getDefaultGPUColorTargetState = (format: GPUTextureFormat): GPUColorTargetState =>
{
    return defaultGPUColorTargetState[format] ??= { format, blend: getGPUBlendState(undefined), writeMask: getGPUColorWriteFlags(undefined) }
};
const defaultGPUColorTargetState: Record<GPUTextureFormat, GPUColorTargetState> = {} as any;

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

    const getGPUFragmentStateKey: GetGPUFragmentStateKey = [device, fragmentState, colorAttachmentsKey];
    let gpuFragmentState = getGPUFragmentStateMap.get(getGPUFragmentStateKey);
    if (gpuFragmentState) return gpuFragmentState.value;

    gpuFragmentState = computed(() =>
    {
        // 监听
        const r_fragmentState = reactive(fragmentState);
        r_fragmentState.code;
        r_fragmentState.targets;
        r_fragmentState.constants;

        // 计算
        const { code, targets, constants } = fragmentState;
        const gpuFragmentState: GPUFragmentState = {
            module: getGPUShaderModule(device, code),
            entryPoint: getEntryPoint(fragmentState),
            targets: getGPUColorTargetStates(targets, colorAttachments),
            constants: getConstants(constants)
        };

        const gpuFragmentStateKey: GPUFragmentStateKey = [gpuFragmentState.module, gpuFragmentState.entryPoint, gpuFragmentState.targets, gpuFragmentState.constants];
        const cache = gpuFragmentStateMap.get(gpuFragmentStateKey);
        if (cache) return cache;

        gpuFragmentStateMap.set(gpuFragmentStateKey, gpuFragmentState);

        return gpuFragmentState;
    });

    getGPUFragmentStateMap.set(getGPUFragmentStateKey, gpuFragmentState);

    return gpuFragmentState.value;
}
type GPUFragmentStateKey = [module: GPUShaderModule, entryPoint: string, targets: Iterable<GPUColorTargetState>, constants: Record<string, number>]
const gpuFragmentStateMap = new ChainMap<GPUFragmentStateKey, GPUFragmentState>();
type GetGPUFragmentStateKey = [device: GPUDevice, fragmentState: FragmentState, colorAttachmentsKey: string];
const getGPUFragmentStateMap = new ChainMap<GetGPUFragmentStateKey, ComputedRef<GPUFragmentState>>;

function getGPUColorTargetStates(targets: readonly ColorTargetState[], colorAttachments: readonly GPUTextureFormat[]): GPUColorTargetState[]
{
    if (!targets) return getDefaultGPUColorTargetStates(colorAttachments);

    const getGPUColorTargetStatesKey: GetGPUColorTargetStatesKey = [targets, colorAttachments];
    let result = getGPUColorTargetStatesMap.get(getGPUColorTargetStatesKey);
    if (result) return result.value;

    result = computed(() =>
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
    getGPUColorTargetStatesMap.set(getGPUColorTargetStatesKey, result);

    return result.value;
}
type GetGPUColorTargetStatesKey = [targets: readonly ColorTargetState[], colorAttachments: readonly GPUTextureFormat[]];
const getGPUColorTargetStatesMap = new ChainMap<GetGPUColorTargetStatesKey, ComputedRef<GPUColorTargetState[]>>();

const getDefaultGPUColorTargetStates = (colorAttachments: readonly GPUTextureFormat[]) =>
{
    return defaultGPUColorTargetStates[colorAttachments.toString()] ??= colorAttachments.map((format) =>
    {
        return getGPUColorTargetState(undefined, format);
    });
};
const defaultGPUColorTargetStates: { [key: string]: GPUColorTargetState[] } = {};

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
