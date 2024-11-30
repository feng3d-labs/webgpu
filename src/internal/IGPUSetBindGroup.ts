import { IGPUBindGroupDescriptor } from "./IGPUBindGroupDescriptor";

/**
 * GPU渲染时使用的绑定组。
 *
 * {@link GPUBindingCommandsMixin.setBindGroup}
 */
export interface IGPUSetBindGroup
{
    /**
     * GPU绑定组。
     *
     * Bind group to use for subsequent render or compute commands.
     */
    bindGroup: IGPUBindGroupDescriptor;

    /**
     * Array containing buffer offsets in bytes for each entry in `bindGroup` marked as {@link GPUBindGroupLayoutEntry#buffer}.{@link GPUBufferBindingLayout#hasDynamicOffset}.-->
     */
    dynamicOffsets?: number[];
}
