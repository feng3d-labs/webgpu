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

    key: string;
}

/**
 * {@link GPUBindGroupLayoutDescriptor}
 */
export interface BindGroupLayoutDescriptor
{
    label?: string;
    entries: GPUBindGroupLayoutEntry[];
    entryNames: string[],
    key: string,
}

declare global
{
    interface GPUBindGroupLayoutEntry
    {
        /**
         * 绑定资源变量信息。
         */
        variableInfo: VariableInfo;

        /**
         * 用于判断布局信息是否相同的标识。
         */
        key: string;
    }
}