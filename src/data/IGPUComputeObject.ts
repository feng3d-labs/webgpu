import { IUniforms } from "@feng3d/render-api";
import { IGPUComputePipeline } from "./IGPUComputePipeline";
import { IGPUWorkgroups } from "./IGPUWorkgroups";

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
    readonly uniforms?: IUniforms;

    /**
     * {@link GPUComputePassEncoder.dispatchWorkgroups}
     *
     * 分配的工作组。
     */
    readonly workgroups?: IGPUWorkgroups;
}
