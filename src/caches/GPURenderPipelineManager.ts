import { computed, Computed, reactive } from "@feng3d/reactivity";
import { BlendComponent, BlendState, ChainMap, ColorTargetState, DepthStencilState, FragmentState, PrimitiveState, RenderPipeline, StencilFaceState, VertexAttributes, VertexState, WGSLVertexType, WriteMask } from "@feng3d/render-api";
import { TemplateInfo, TypeInfo } from "wgsl_reflect";

import { MultisampleState } from "../data/MultisampleState";
import { RenderPassFormat } from "../internal/RenderPassFormat";
import { FunctionInfoManager } from "./FunctionInfoManager";
import { WgslReflectManager } from "./WgslReflectManager";
import { GPUPipelineLayoutManager } from "./GPUPipelineLayoutManager";
import { GPUShaderModuleManager } from "./GPUShaderModuleManager";
import { GPUVertexBufferManager } from "./GPUVertexBufferManager";

export class GPURenderPipelineManager
{
    /**
     * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
     *
     * @param renderPipeline 渲染管线描述。
     * @param renderPass 渲染通道描述。
     * @param vertices 顶点属性数据映射。
     * @returns 完整的渲染管线描述以及顶点缓冲区数组。
     */
    static getGPURenderPipeline(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat)
    {
        const getGPURenderPipelineKey: GetGPURenderPipelineKey = [device, renderPipeline, renderPassFormat, vertices, indexFormat];
        let result = this.getGPURenderPipelineMap.get(getGPURenderPipelineKey);
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
            r_renderPipeline.fragment?.code;
            r_renderPipeline.multisample;

            // 计算
            const { label, vertex, fragment, primitive, depthStencil, multisample } = renderPipeline;
            const shader = { vertex: vertex.code, fragment: fragment?.code };
            const { colorFormats, depthStencilFormat, sampleCount } = renderPassFormat;
            const gpuVertexState = this.getGPUVertexState(device, vertex, vertices);
            //
            const gpuRenderPipelineDescriptor: GPURenderPipelineDescriptor = {
                label,
                layout: GPUPipelineLayoutManager.getGPUPipelineLayout(device, shader),
                vertex: gpuVertexState,
                fragment: this.getGPUFragmentState(device, fragment, colorFormats),
                primitive: this.getGPUPrimitiveState(primitive, indexFormat),
                depthStencil: this.getGPUDepthStencilState(depthStencil, depthStencilFormat),
                multisample: this.getGPUMultisampleState(multisample, sampleCount),
            };

            const gpuRenderPipeline = device.createRenderPipeline(gpuRenderPipelineDescriptor);

            return gpuRenderPipeline;
        });
        this.getGPURenderPipelineMap.set(getGPURenderPipelineKey, result);

        return result.value;
    }


    /**
     * 获取完整的顶点阶段描述与顶点缓冲区列表。
     *
     * @param vertexState 顶点阶段信息。
     * @param vertices 顶点数据。
     * @returns 完整的顶点阶段描述与顶点缓冲区列表。
     */
    private static getGPUVertexState(device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes)
    {
        const getGPUVertexStateKey: GetGPUVertexStateKey = [device, vertexState, vertices];
        const result = this.getGPUVertexStateMap.get(getGPUVertexStateKey);
        if (result) return result.value;

        return this.getGPUVertexStateMap.set(getGPUVertexStateKey, computed(() =>
        {
            // 监听
            const r_vertexState = reactive(vertexState);
            r_vertexState.code;
            r_vertexState.constants;

            // 计算
            const { code, constants } = vertexState;

            const vertexEntryFunctionInfo = FunctionInfoManager.getVertexEntryFunctionInfo(vertexState);
            const vertexBufferLayouts = GPUVertexBufferManager.getGPUVertexBufferLayouts(vertexState, vertices);

            const gpuVertexState: GPUVertexState = {
                module: GPUShaderModuleManager.getGPUShaderModule(device, code),
                entryPoint: vertexEntryFunctionInfo.name,
                buffers: vertexBufferLayouts,
                constants: this.getConstants(constants),
            };

            // 缓存
            const gpuVertexStateKey: GPUVertexStateKey = [gpuVertexState.module, gpuVertexState.entryPoint, gpuVertexState.buffers, gpuVertexState.constants];
            const cache = this.gpuVertexStateMap.get(gpuVertexStateKey);
            if (cache) return cache;
            this.gpuVertexStateMap.set(gpuVertexStateKey, gpuVertexState);

            return gpuVertexState;
        })).value;
    }

    private static getConstants(constants: Record<string, number>)
    {
        if (!constants) return undefined;

        let result: Computed<Record<string, number>> = this.getConstantsMap.get(constants);
        if (result) return result.value;

        result = computed(() =>
        {
            const r_constants = reactive(constants);

            let constantsKey = "";
            for (const key in r_constants)
            {
                constantsKey += `${key}:${r_constants[key]},`;
            }

            if (this.constantsMap[constantsKey])
            {
                return this.constantsMap[constantsKey];
            }
            this.constantsMap[constantsKey] = constants;

            return constants;
        });
        this.getConstantsMap.set(constants, result);

        return result.value;
    }
    private static readonly constantsMap: { [constantsKey: string]: Record<string, number> } = {};
    private static readonly getConstantsMap = new WeakMap<Record<string, number>, Computed<Record<string, number>>>();

    private static getGPUPrimitiveState(primitive?: PrimitiveState, indexFormat?: GPUIndexFormat): GPUPrimitiveState
    {
        if (!primitive) return this.defaultGPUPrimitiveState;

        const result: Computed<GPUPrimitiveState> = primitive[`_cache_GPUPrimitiveState_${indexFormat}`] ??= computed(() =>
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

    private static getGPUMultisampleState(multisampleState?: MultisampleState, sampleCount?: 4)
    {
        if (!sampleCount) return undefined;
        if (!multisampleState) return this.defaultGPUMultisampleState;

        const result: Computed<GPUMultisampleState> = multisampleState[`_cache_GPUMultisampleState_${sampleCount}`] ??= computed(() =>
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
    private static getGPUDepthStencilState(depthStencil: DepthStencilState, depthStencilFormat?: GPUTextureFormat)
    {
        if (!depthStencilFormat) return undefined;

        if (!depthStencil) return this.getDefaultGPUDepthStencilState(depthStencilFormat);

        const getGPUDepthStencilStateKey: GetGPUDepthStencilStateKey = [depthStencil, depthStencilFormat];
        let result = this.getGPUDepthStencilStateMap.get(getGPUDepthStencilStateKey);
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
            const { depthWriteEnabled,
                depthCompare,
                stencilFront,
                stencilBack,
                stencilReadMask,
                stencilWriteMask,
                depthBias,
                depthBiasSlopeScale,
                depthBiasClamp,
            } = depthStencil;
            const gpuDepthStencilState: GPUDepthStencilState = {
                format: depthStencilFormat,
                depthWriteEnabled: depthWriteEnabled ?? true,
                depthCompare: depthCompare ?? "less",
                stencilFront: this.getGPUStencilFaceState(stencilFront),
                stencilBack: this.getGPUStencilFaceState(stencilBack),
                stencilReadMask: stencilReadMask ?? 0xFFFFFFFF,
                stencilWriteMask: stencilWriteMask ?? 0xFFFFFFFF,
                depthBias: depthBias ?? 0,
                depthBiasSlopeScale: depthBiasSlopeScale ?? 0,
                depthBiasClamp: depthBiasClamp ?? 0,
            };

            // 缓存
            const gpuDepthStencilStateKey: GPUDepthStencilStateKey = [
                gpuDepthStencilState.format,
                gpuDepthStencilState.depthWriteEnabled,
                gpuDepthStencilState.depthCompare,
                gpuDepthStencilState.stencilFront,
                gpuDepthStencilState.stencilBack,
                gpuDepthStencilState.stencilReadMask,
                gpuDepthStencilState.stencilWriteMask,
                gpuDepthStencilState.depthBias,
                gpuDepthStencilState.depthBiasSlopeScale,
                gpuDepthStencilState.depthBiasClamp,
            ];
            const cache = this.gpuDepthStencilStateMap.get(gpuDepthStencilStateKey);
            if (cache) return cache;
            this.gpuDepthStencilStateMap.set(gpuDepthStencilStateKey, gpuDepthStencilState);

            //
            return gpuDepthStencilState;
        });
        this.getGPUDepthStencilStateMap.set(getGPUDepthStencilStateKey, result);

        return result.value;
    }

    /**
     * 获取片段阶段完整描述。
     *
     * @param fragment 片段阶段描述。
     */
    private static getDefaultGPUDepthStencilState(depthStencilFormat: GPUTextureFormat)
    {
        let result = this.defaultGPUDepthStencilStates[depthStencilFormat];
        if (result) return result;

        result = this.defaultGPUDepthStencilStates[depthStencilFormat] = {
            format: depthStencilFormat,
            depthWriteEnabled: true,
            depthCompare: "less",
            stencilFront: {},
            stencilBack: {},
            stencilReadMask: 0xFFFFFFFF,
            stencilWriteMask: 0xFFFFFFFF,
            depthBias: 0,
            depthBiasSlopeScale: 0,
            depthBiasClamp: 0,
        };

        return result;
    }

    private static getGPUStencilFaceState(stencilFaceState?: StencilFaceState)
    {
        if (!stencilFaceState) return this.defaultGPUStencilFaceState;

        let result = this.getGPUStencilFaceStateMap.get(stencilFaceState);
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
            const cache = this.GPUStencilFaceStateMap.get(gpuStencilFaceStateKey);
            if (cache) return cache;
            this.GPUStencilFaceStateMap.set(gpuStencilFaceStateKey, gpuStencilFaceState);

            //
            return gpuStencilFaceState;
        });
        this.getGPUStencilFaceStateMap.set(stencilFaceState, result);

        return result.value;
    }

    private static getGPUColorTargetState(colorTargetState: ColorTargetState, format: GPUTextureFormat)
    {
        if (!colorTargetState) return this.getDefaultGPUColorTargetState(format);

        const result: Computed<GPUColorTargetState> = colorTargetState[`_GPUColorTargetState_${format}`] ??= computed(() =>
        {
            // 监听
            const r_colorTargetState = reactive(colorTargetState);
            r_colorTargetState.writeMask;
            r_colorTargetState.blend;

            // 计算
            const { writeMask, blend } = colorTargetState;
            const gpuColorTargetState: GPUColorTargetState = {
                format,
                blend: this.getGPUBlendState(blend),
                writeMask: this.getGPUColorWriteFlags(writeMask),
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
    private static getGPUFragmentState(device: GPUDevice, fragmentState: FragmentState, colorAttachments: readonly GPUTextureFormat[])
    {
        if (!fragmentState) return undefined;

        const colorAttachmentsKey = colorAttachments.toLocaleString();

        const getGPUFragmentStateKey: GetGPUFragmentStateKey = [device, fragmentState, colorAttachmentsKey];
        let gpuFragmentState = this.getGPUFragmentStateMap.get(getGPUFragmentStateKey);
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
                module: GPUShaderModuleManager.getGPUShaderModule(device, code),
                entryPoint: this.getEntryPoint(fragmentState),
                targets: this.getGPUColorTargetStates(targets, colorAttachments),
                constants: this.getConstants(constants)
            };

            const gpuFragmentStateKey: GPUFragmentStateKey = [gpuFragmentState.module, gpuFragmentState.entryPoint, gpuFragmentState.targets, gpuFragmentState.constants];
            const cache = this.gpuFragmentStateMap.get(gpuFragmentStateKey);
            if (cache) return cache;

            this.gpuFragmentStateMap.set(gpuFragmentStateKey, gpuFragmentState);

            return gpuFragmentState;
        });

        this.getGPUFragmentStateMap.set(getGPUFragmentStateKey, gpuFragmentState);

        return gpuFragmentState.value;
    }

    private static getGPUColorTargetStates(targets: readonly ColorTargetState[], colorAttachments: readonly GPUTextureFormat[]): GPUColorTargetState[]
    {
        if (!targets) return this.getDefaultGPUColorTargetStates(colorAttachments);

        const getGPUColorTargetStatesKey: GetGPUColorTargetStatesKey = [targets, colorAttachments];
        let result = this.getGPUColorTargetStatesMap.get(getGPUColorTargetStatesKey);
        if (result) return result.value;

        result = computed(() =>
            colorAttachments.map((format, i) =>
            {
                if (!format) return undefined;

                // 监听
                reactive(targets)[i];

                // 计算
                const gpuColorTargetState = this.getGPUColorTargetState(targets[i], format);

                return gpuColorTargetState;
            }));
        this.getGPUColorTargetStatesMap.set(getGPUColorTargetStatesKey, result);

        return result.value;
    }


    private static getEntryPoint(fragmentState: FragmentState)
    {
        const result: Computed<string> = fragmentState["_entryPoint"] ??= computed(() =>
        {
            // 监听
            const r_fragmentState = reactive(fragmentState);
            r_fragmentState.entryPoint;
            r_fragmentState.code;

            // 计算
            const { entryPoint, code } = fragmentState;
            //
            if (entryPoint) return entryPoint;
            const reflect = WgslReflectManager.getWGSLReflectInfo(code);
            const fragment = reflect.entry.fragment[0];
            console.assert(!!fragment, `WGSL着色器 ${code} 中不存在片元入口点。`);

            return fragment.name;
        });

        return result.value;
    }

    private static getGPUBlendState(blend?: BlendState): GPUBlendState
    {
        if (!blend) return undefined;

        let result: Computed<GPUBlendState> = blend["_GPUBlendState"];
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
                color: this.getGPUBlendComponent(color),
                alpha: this.getGPUBlendComponent(alpha),
            };

            return gpuBlend;
        });

        return result.value;
    }

    private static getGPUBlendComponent(blendComponent?: BlendComponent): GPUBlendComponent
    {
        if (!blendComponent) return { operation: "add", srcFactor: "one", dstFactor: "zero" };

        const result: Computed<GPUBlendComponent> = blendComponent["_GPUBlendComponent"] ??= computed(() =>
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

    private static getGPUColorWriteFlags(writeMask?: WriteMask)
    {
        if (!writeMask) return 15;

        const result: Computed<GPUColorWriteFlags> = writeMask["_GPUColorWriteFlags"] ??= computed(() =>
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

    private static getWGSLType(type: TypeInfo)
    {
        let wgslType = type.name;
        if (this.isTemplateType(type))
        {
            wgslType += `<${type.format.name}>`;
        }
        if (this.wgslTypeMap[wgslType])
        {
            wgslType = this.wgslTypeMap[wgslType];
        }

        return wgslType as WGSLVertexType;
    }

    /**
     * 别名
     */
    private static readonly wgslTypeMap = {
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

    private static isTemplateType(type: TypeInfo): type is TemplateInfo
    {
        return !!(type as TemplateInfo).format;
    }


    private static readonly getDefaultGPUColorTargetState = (format: GPUTextureFormat): GPUColorTargetState =>
        this.defaultGPUColorTargetState[format] ??= { format, blend: this.getGPUBlendState(undefined), writeMask: this.getGPUColorWriteFlags(undefined) };
    private static readonly defaultGPUColorTargetState: Record<GPUTextureFormat, GPUColorTargetState> = {} as any;

    private static readonly defaultGPUStencilFaceState: GPUStencilFaceState = {};
    private static readonly getGPUStencilFaceStateMap = new WeakMap<StencilFaceState, Computed<GPUStencilFaceState>>();

    private static readonly getGPURenderPipelineMap = new ChainMap<GetGPURenderPipelineKey, Computed<GPURenderPipeline>>();
    private static readonly getGPUVertexStateMap = new ChainMap<GetGPUVertexStateKey, Computed<GPUVertexState>>();
    private static readonly gpuVertexStateMap = new ChainMap<any[], GPUVertexState>();
    private static readonly defaultGPUPrimitiveState: GPUPrimitiveState = { topology: "triangle-list", cullMode: "none", frontFace: "ccw" };
    private static readonly defaultGPUMultisampleState: GPUMultisampleState = { count: 4, mask: 0xFFFFFFFF, alphaToCoverageEnabled: false };
    private static readonly getGPUDepthStencilStateMap = new ChainMap<GetGPUDepthStencilStateKey, Computed<GPUDepthStencilState>>();
    private static readonly gpuDepthStencilStateMap = new ChainMap<GPUDepthStencilStateKey, GPUDepthStencilState>();
    private static readonly defaultGPUDepthStencilStates: Record<GPUTextureFormat, GPUDepthStencilState> = {} as any;
    private static readonly GPUStencilFaceStateMap = new ChainMap<GPUStencilFaceStateKey, GPUStencilFaceState>();
    private static readonly gpuFragmentStateMap = new ChainMap<GPUFragmentStateKey, GPUFragmentState>();
    private static readonly getGPUFragmentStateMap = new ChainMap<GetGPUFragmentStateKey, Computed<GPUFragmentState>>();
    private static readonly getGPUColorTargetStatesMap = new ChainMap<GetGPUColorTargetStatesKey, Computed<GPUColorTargetState[]>>();
    private static readonly getDefaultGPUColorTargetStates = (colorAttachments: readonly GPUTextureFormat[]) =>
        this.defaultGPUColorTargetStates[colorAttachments.toString()] ??= colorAttachments.map((format) =>
            this.getGPUColorTargetState(undefined, format));
    private static readonly defaultGPUColorTargetStates: { [key: string]: GPUColorTargetState[] } = {};
}

type GetGPURenderPipelineKey = [device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat];
type GetGPUVertexStateKey = [device: GPUDevice, vertexState: VertexState, vertices: VertexAttributes];
type GPUVertexStateKey = [module: GPUShaderModule, entryPoint: string, buffers: Iterable<GPUVertexBufferLayout>, constants: Record<string, number>];
type GetGPUDepthStencilStateKey = [depthStencil: DepthStencilState, depthStencilFormat: GPUTextureFormat];
type GPUDepthStencilStateKey = [format: GPUTextureFormat, depthWriteEnabled: boolean, depthCompare: GPUCompareFunction, stencilFront: GPUStencilFaceState, stencilBack: GPUStencilFaceState, stencilReadMask: number, stencilWriteMask: number, depthBias: number, depthBiasSlopeScale: number, depthBiasClamp: number];
type GPUStencilFaceStateKey = [compare: GPUCompareFunction, failOp: GPUStencilOperation, depthFailOp: GPUStencilOperation, passOp: GPUStencilOperation];
type GPUFragmentStateKey = [module: GPUShaderModule, entryPoint: string, targets: Iterable<GPUColorTargetState>, constants: Record<string, number>];
type GetGPUFragmentStateKey = [device: GPUDevice, fragmentState: FragmentState, colorAttachmentsKey: string];
type GetGPUColorTargetStatesKey = [targets: readonly ColorTargetState[], colorAttachments: readonly GPUTextureFormat[]];
