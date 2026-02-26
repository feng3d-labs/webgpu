/**
 * 顶点着色器阶段描述。
 */
export interface VertexState
{
    /**
     * 着色器代码。
     */
    readonly code?: string;

    /**
     * GLSL着色器代码。
     *
     * @deprecated 已移除 WebGL 支持，请使用 WGSL 或 code 属性。
     */
    readonly glsl?: string;

    /**
     * WGSL着色器代码。适用于WebGPU。
     */
    readonly wgsl?: string;

    /**
     * 入口函数名称。
     */
    readonly entryPoint?: string;

    /**
     * Specifies the values of pipeline-overridable constants in the shader module.
     */
    readonly constants?: Readonly<Record<string, GPUPipelineConstantValue>>;
}
