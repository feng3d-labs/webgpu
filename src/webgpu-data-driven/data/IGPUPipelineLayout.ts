import { IGPUBindGroupLayoutDescriptor } from './IGPUBindGroup';

/**
 * GPU管线布局描述。
 *
 * {@link GPUPipelineLayoutDescriptor}
 *
 * {@link GPUDevice.createPipelineLayout}
 *
 * {@link GPUPipelineLayout}
 */
export interface IGPUPipelineLayout extends Omit<GPUPipelineLayoutDescriptor, 'bindGroupLayouts'>
{
    /**
     * A list of {@link GPUBindGroupLayout}s the pipeline will use. Each element corresponds to a
     * @group attribute in the {@link GPUShaderModule}, with the `N`th element corresponding with
     * `@group(N)`.
     */
    bindGroupLayouts: IGPUBindGroupLayoutDescriptor[];
}
