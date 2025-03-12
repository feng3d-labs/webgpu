import { VariableInfo } from "wgsl_reflect";

/**
 * GPU管线布局描述。
 *
 * {@link GPUPipelineLayoutDescriptor}
 *
 * {@link GPUDevice.createPipelineLayout}
 *
 * {@link GPUPipelineLayout}
 */
export interface PipelineLayoutDescriptor
{
    label?: string;
    /**
     * A list of {@link GPUBindGroupLayout}s the pipeline will use. Each element corresponds to a
     * @group attribute in the {@link GPUShaderModule}, with the `N`th element corresponding with
     * `@group(N)`.
     */
    bindGroupLayouts: BindGroupLayoutDescriptor[];
}

export interface BindGroupLayoutDescriptor
{
    label?: string;
    entries: BindGroupLayoutEntry[];
    entryNames: string[],
}

export interface BindGroupLayoutEntry extends GPUBindGroupLayoutEntry
{
    variableInfo: VariableInfo;
}