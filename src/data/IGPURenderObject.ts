import { IGPUBindingResources } from "./IGPUBindingResources";
import { IGPUVertexAttributes } from "./IGPUVertexAttributes";

/**
 * GPU渲染对象，包含一次渲染时包含的所有数据。
 */
export interface IGPURenderObject
{
    /**
     * 数据类型。
     */
    readonly __type?: "IGPURenderObject";

    /**
     * GPU渲染管线描述。
     */
    readonly pipeline: IGPURenderPipeline;

    /**
     * 顶点属性数据映射。
     */
    readonly vertices?: IGPUVertexAttributes;

    /**
     * 索引数据。
     */
    readonly indices?: Uint16Array | Uint32Array,

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    readonly bindingResources?: IGPUBindingResources;

    /**
     * 绘制图元相关参数。
     */
    readonly draw?: IGPUDraw;

    /**
     * 根据索引数据绘制图元相关参数。
     */
    readonly drawIndexed?: IGPUDrawIndexed;
}

/**
 * 根据索引数据绘制图元相关参数。
 *
 * {@link GPURenderCommandsMixin.drawIndexed}
 */
export interface IGPUDrawIndexed
{
    /**
     * The number of indices to draw.
     */
    readonly indexCount: number;

    /**
     * The number of instances to draw.
     */
    readonly instanceCount?: number;

    /**
     * Offset into the index buffer, in indices, begin drawing from.
     */
    readonly firstIndex?: number;

    /**
     * Added to each index value before indexing into the vertex buffers.
     */
    readonly baseVertex?: number;

    /**
     * First instance to draw.
     */
    readonly firstInstance?: number;
}

/**
 * Draws primitives.
 *
 * 绘制图元相关参数。
 *
 * @see GPURenderCommandsMixin.draw
 */
export interface IGPUDraw
{
    /**
     * The number of vertices to draw.
     */
    readonly vertexCount: number;

    /**
     * The number of instances to draw.
     */
    readonly instanceCount?: number;

    /**
     * Offset into the vertex buffers, in vertices, to begin drawing from.
     */
    readonly firstVertex?: number;

    /**
     * First instance to draw.
     */
    readonly firstInstance?: number;
}

/**
 * GPU渲染管线描述。
 *
 * {@link GPURenderPipelineDescriptor}
 */
export interface IGPURenderPipeline
{
    /**
     * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
     */
    readonly label?: string;

    /**
     * Describes the primitive-related properties of the pipeline.
     */
    readonly primitive?: IGPUPrimitiveState;

    /**
     * 描述顶点着色器源码入口点以及顶点属性缓冲区布局。
     */
    readonly vertex: IGPUVertexState;

    /**
     * 片段着色器阶段描述。
     */
    readonly fragment?: IGPUFragmentState;

    /**
     * 深度模板阶段描述。
     */
    readonly depthStencil?: IGPUDepthStencilState;

    /**
     * 多重采样阶段描述。
     */
    multisample?: IGPUMultisampleState;
}

/**
 * 深度模板阶段描述。
 *
 * `format` 将从深度附件 {@link IGPURenderPassDescriptor.depthStencilAttachment} 纹理上获取。
 */
export interface IGPUDepthStencilState extends Omit<GPUDepthStencilState, "format">
{
    /**
     * Indicates if this {@link GPURenderPipeline} can modify
     * {@link GPURenderPassDescriptor#depthStencilAttachment} depth values.
     *
     * 默认为 `true` 。
     */
    depthWriteEnabled?: boolean;

    /**
     * The comparison operation used to test fragment depths against
     * {@link GPURenderPassDescriptor#depthStencilAttachment} depth values.
     *
     * 默认 `'less'` 。
     */
    depthCompare?: GPUCompareFunction;
}

/**
 * 多重采样阶段描述。
 *
 * 多重采样次数将由 {@link IGPURenderPassDescriptor.multisample} 覆盖。
 */
export interface IGPUMultisampleState
{
    /**
     * Mask determining which samples are written to.
     */
    readonly mask?: GPUSampleMask;

    /**
     * When `true` indicates that a fragment's alpha channel should be used to generate a sample
     * coverage mask.
     */
    readonly alphaToCoverageEnabled?: boolean;
}

/**
 * {@link GPUPrimitiveState}
 */
export interface IGPUPrimitiveState extends GPUPrimitiveState
{
    /**
     * The type of primitive to be constructed from the vertex inputs.
     *
     * WebGPU 默认 `"triangle-list"` ,默认每三个顶点绘制一个三角形。
     */
    readonly topology?: GPUPrimitiveTopology;

    /**
     * Defines which polygon orientation will be culled, if any.
     *
     * WebGPU 默认 `"none"` ,不进行剔除。
     */
    readonly cullMode?: GPUCullMode;
}

/**
 * GPU顶点程序阶段。
 *
 * 描述顶点着色器源码入口点以及顶点属性缓冲区布局。
 *
 * 顶点属性缓冲区布局将由给出顶点数据自动生成。
 *
 * @see GPUVertexState
 */
export interface IGPUVertexState
{
    /**
     * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
     */
    readonly code: string;

    /**
     * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
     * perform its work.
     *
     * 入口函数可选。默认从着色器中进行反射获取。
     */
    readonly entryPoint?: string;

    /**
     * Specifies the values of pipeline-overridable constants in the shader module
     * {@link GPUProgrammableStage#module}.
     * Each such pipeline-overridable constant is uniquely identified by a single
     * pipeline-overridable constant identifier string, representing the pipeline
     * constant ID of the constant if its declaration specifies one, and otherwise the
     * constant's identifier name.
     * The key of each key-value pair must equal the
     * pipeline-overridable constant identifier string|identifier string
     * of one such constant, with the comparison performed
     * according to the rules for WGSL identifier comparison.
     * When the pipeline is executed, that constant will have the specified value.
     * Values are specified as <dfn typedef for="">GPUPipelineConstantValue</dfn>, which is a {@link double}.
     * They are converted [$to WGSL type$] of the pipeline-overridable constant (`bool`/`i32`/`u32`/`f32`/`f16`).
     * If conversion fails, a validation error is generated.
     */
    readonly constants?: Readonly<Record<
        string,
        GPUPipelineConstantValue
    >>;
}

export interface NGPUVertexState extends IGPUVertexState
{
    /**
     * A list of {@link GPUVertexBufferLayout}s defining the layout of the vertex attribute data in the
     * vertex buffers used by this pipeline.
     *
     * 自动根据反射信息生成，不用设置。
     */
    buffers?: GPUVertexBufferLayout[];
}

/**
 * GPU片元程序阶段。
 *
 * {@link GPUFragmentState}
 */
export interface IGPUFragmentState extends Omit<GPUFragmentState, "module" | "targets">
{
    /**
     * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
     */
    code: string;

    /**
     * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
     * perform its work.
     *
     * 入口函数可选。默认从着色器中进行反射获取。
     */
    entryPoint?: string;

    /**
     * A list of {@link GPUColorTargetState} defining the formats and behaviors of the color targets
     * this pipeline writes to.
     */
    targets?: IGPUColorTargetState[];
}

/**
 * 属性 `format` 将由渲染通道中附件给出。
 */
export interface IGPUColorTargetState extends Omit<GPUColorTargetState, "format">
{
    /**
     * The {@link GPUTextureFormat} of this color target. The pipeline will only be compatible with
     * {@link GPURenderPassEncoder}s which use a {@link GPUTextureView} of this format in the
     * corresponding color attachment.
     *
     * 属性 `format` 将由渲染通道中附件给出。
     */
    format?: GPUTextureFormat;
}
