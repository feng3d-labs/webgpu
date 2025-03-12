import { GPUComputeStage } from "./IGPUComputeStage";

/**
 * GPU计算管线。
 *
 * {@link GPUDevice.createComputePipeline}
 * {@link GPUComputePipelineDescriptor}
 */
export interface GPU_ComputePipeline
{
    /**
     * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
     */
    readonly label?: string;

    /**
     * 计算程序。
     */
    readonly compute: GPUComputeStage;
}