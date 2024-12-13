import { IBlendState } from "@feng3d/render-api";
import { IGPUDepthStencilState } from "./IGPUDepthStencilState";
import { IGPUMultisampleState } from "./IGPUMultisampleState";

declare module "@feng3d/render-api"
{
    /**
     * GPU渲染管线。
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline
     */
    export interface IRenderPipeline
    {
        /**
         * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
         */
        readonly label?: string;

        /**
         * 描述顶点着色器源码入口点。
         */
        readonly vertex: IVertexState;

        /**
         * 片段着色器阶段描述。
         */
        readonly fragment?: IFragmentState;

        /**
         * 深度模板阶段描述。
         */
        readonly depthStencil?: IGPUDepthStencilState;

        /**
         * 多重采样阶段描述。
         */
        readonly multisample?: IGPUMultisampleState;
    }

    /**
     * GPU顶点程序阶段。
     *
     * 描述顶点着色器源码入口点以及顶点属性缓冲区布局。
     *
     * `buffers` 顶点属性缓冲区布局将由给出顶点数据自动生成。
     *
     * @see GPUVertexState
     */
    export interface IVertexState
    {
        /**
         * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
         */
        readonly code: string;

        /**
         * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
         * perform its work.
         *
         * 入口函数可选。默认从着色器中进行反射获取。
         */
        readonly entryPoint?: string;

        /**
         * Specifies the values of pipeline-overridable constants in the shader module
         * {@link GPUProgrammableStage#module}.
         * Each such pipeline-overridable constant is uniquely identified by a single
         * pipeline-overridable constant identifier string, representing the pipeline
         * constant ID of the constant if its declaration specifies one, and otherwise the
         * constant's identifier name.
         * The key of each key-value pair must equal the
         * pipeline-overridable constant identifier string|identifier string
         * of one such constant, with the comparison performed
         * according to the rules for WGSL identifier comparison.
         * When the pipeline is executed, that constant will have the specified value.
         * Values are specified as <dfn typedef for="">GPUPipelineConstantValue</dfn>, which is a {@link double}.
         * They are converted [$to WGSL type$] of the pipeline-overridable constant (`bool`/`i32`/`u32`/`f32`/`f16`).
         * If conversion fails, a validation error is generated.
         */
        readonly constants?: Readonly<Record<
            string,
            GPUPipelineConstantValue
        >>;
    }

    /**
     * GPU片元程序阶段。
     *
     * {@link GPUFragmentState}
     */
    export interface IFragmentState
    {
        /**
         * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
         */
        readonly code: string;

        /**
         * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
         * perform its work.
         *
         * 入口函数可选。默认从着色器中进行反射获取。
         */
        readonly entryPoint?: string;

        /**
         * A list of {@link GPUColorTargetState} defining the formats and behaviors of the color targets
         * this pipeline writes to.
         */
        readonly targets?: readonly IColorTargetState[];

        /**
         * Specifies the values of pipeline-overridable constants in the shader module
         * {@link GPUProgrammableStage#module}.
         * Each such pipeline-overridable constant is uniquely identified by a single
         * pipeline-overridable constant identifier string, representing the pipeline
         * constant ID of the constant if its declaration specifies one, and otherwise the
         * constant's identifier name.
         * The key of each key-value pair must equal the
         * pipeline-overridable constant identifier string|identifier string
         * of one such constant, with the comparison performed
         * according to the rules for WGSL identifier comparison.
         * When the pipeline is executed, that constant will have the specified value.
         * Values are specified as <dfn typedef for="">GPUPipelineConstantValue</dfn>, which is a {@link double}.
         * They are converted [$to WGSL type$] of the pipeline-overridable constant (`bool`/`i32`/`u32`/`f32`/`f16`).
         * If conversion fails, a validation error is generated.
         */
        readonly constants?: Readonly<Record<
            string,
            GPUPipelineConstantValue
        >>;
    }

    /**
     * 属性 `format` 将由渲染通道中附件给出。
     * 
     * @see https://gpuweb.github.io/gpuweb/#dictdef-gpucolortargetstate
     */
    export interface IColorTargetState
    {
        /**
         * The blending behavior for this color target. If left undefined, disables blending for this
         * color target.
         * 
         * 定义如何混合到目标颜色中。
         * 
         * 默认 `undefined`，表示不进行混合。
         */
        readonly blend?: IBlendState;
    }

    /**
     * 扩展仅WebGPU支持的混合参数。 "src1" | "one-minus-src1" | "src1-alpha" | "one-minus-src1-alpha" 需要开启扩展 `dual-source-blending` 。 
     */
    export interface IBlendFactorMap
    {
        "src1": "src1";
        "one-minus-src1": "one-minus-src1";
        "src1-alpha": "src1-alpha";
        "one-minus-src1-alpha": "one-minus-src1-alpha";
    }
}
