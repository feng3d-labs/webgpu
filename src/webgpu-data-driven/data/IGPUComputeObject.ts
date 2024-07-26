import { IGPUPipelineLayout } from './IGPUPipelineLayout';
import { IGPUSetBindGroup } from './IGPURenderObject';

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
     * 绑定组列表。
     *
     * {@link GPUBindingCommandsMixin.setBindGroup}
     */
    bindGroups?: IGPUSetBindGroup[];

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
export interface IGPUComputePipeline extends Omit<GPUComputePipelineDescriptor, 'layout' | 'compute'>
{
    /**
     * 默认 `'auto'` 。
     */
    layout?: 'auto' | IGPUPipelineLayout;

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
export interface IGPUProgrammableStage extends Omit<GPUProgrammableStage, 'module'>
{
    /**
     * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
     */
    code: string;
}
