import { IGPUBindingResources } from "./IGPUBindingResources";

/**
 * GPU计算对象，包含GPU一次计算所有数据。
 *
 * {@link GPUComputePassEncoder.setPipeline}
 *
 * {@link GPUBindingCommandsMixin.setBindGroup}
 *
 * {@link GPUComputePassEncoder.dispatchWorkgroups}
 */
export interface IGPUComputeObject
{
    /**
     * 计算管线。
     */
    readonly pipeline: IGPUComputePipeline;

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    readonly bindingResources?: IGPUBindingResources;

    /**
     * {@link GPUComputePassEncoder.dispatchWorkgroups}
     *
     * 分配的工作组。
     */
    readonly workgroups?: IGPUWorkgroups;
}

/**
 * 分配的工作组。
 *
 * {@link GPUComputePassEncoder.dispatchWorkgroups}
 */
export interface IGPUWorkgroups
{
    /**
     * X的维度工作组数量。
     */
    readonly workgroupCountX: GPUSize32;

    /**
     * Y的维度工作组数量。
     */
    readonly workgroupCountY?: GPUSize32;

    /**
     * Z的维度工作组数量。
     */
    readonly workgroupCountZ?: GPUSize32;
}

/**
 * GPU计算管线。
 *
 * {@link GPUDevice.createComputePipeline}
 * {@link GPUComputePipelineDescriptor}
 */
export interface IGPUComputePipeline
{
    /**
     * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
     */
    readonly label?: string;

    /**
     * 计算程序。
     */
    readonly compute: IGPUComputeStage;
}

/**
 * GPU计算阶段。
 */
export interface IGPUComputeStage
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
