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
