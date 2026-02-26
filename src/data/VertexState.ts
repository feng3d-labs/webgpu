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
     * GLSL着色器代码。适用于WebGL。
     */
    readonly glsl?: string;

    /**
     * WGSL着色器代码。适用于WebGPU。
     */
    readonly wgsl?: string;
}
