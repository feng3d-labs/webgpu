import { IGPUBindingResources } from "./IGPUBindingResources";
import { IGPUPipelineLayout } from "./IGPUPipelineLayout";
import { IGPUSetBindGroup } from "./IGPURenderObject";

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
    pipeline: IGPUComputePipeline;

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    bindingResources?: IGPUBindingResources;

    /**
     * {@link GPUComputePassEncoder.dispatchWorkgroups}
     *
     * 分配的工作组。
     */
    workgroups?: IGPUWorkgroups;
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
    workgroupCountX: GPUSize32;

    /**
     * Y的维度工作组数量。
     */
    workgroupCountY?: GPUSize32;

    /**
     * Z的维度工作组数量。
     */
    workgroupCountZ?: GPUSize32;
}

/**
 * GPU计算管线。
 *
 * {@link GPUDevice.createComputePipeline}
 * {@link GPUComputePipelineDescriptor}
 */
export interface IGPUComputePipeline extends Omit<GPUComputePipelineDescriptor, "layout" | "compute">
{
    /**
     * 默认 `'auto'` 。
     */
    layout?: "auto" | IGPUPipelineLayout;

    /**
     * 计算程序。
     */
    compute: IGPUComputeStage;
}

/**
 * GPU计算阶段。
 */
export interface IGPUComputeStage extends IGPUProgrammableStage
{

}

/**
 * GPU可编程阶段。
 *
 * @see GPUProgrammableStage
 */
export interface IGPUProgrammableStage extends Omit<GPUProgrammableStage, "module">
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
}
