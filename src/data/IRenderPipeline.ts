import { IFragmentState } from "./IFragmentState";
import { IGPUDepthStencilState, IGPUMultisampleState, IGPURenderPipeline, IGPUVertexState } from "./IGPURenderObject";

/**
 * 渲染管线描述。
 *
 * @see IGPURenderPipeline
 */
export interface IRenderPipeline extends Omit<IGPURenderPipeline, "vertex" | "fragment" | "depthStencil">
{
    /**
     * 描述顶点着色器源码入口点以及顶点属性缓冲区布局。
     */
    vertex: IGPUVertexState;

    /**
     * 片段着色器阶段描述。
     */
    fragment?: IFragmentState;

    /**
     * 深度模板阶段描述。
     */
    depthStencil?: IDepthStencilState;

    /**
     * 多重采样阶段描述。
     */
    multisample?: IMultisampleState;
}

/**
 * 多重采样阶段描述。
 *
 * 多重采样次数将由 {@link IGPURenderPassDescriptor.multisample} 覆盖。
 */
export interface IMultisampleState extends Omit<IGPUMultisampleState, "count">
{

}

/**
 * 深度模板阶段描述。
 *
 * `format` 将从深度附件 {@link IGPURenderPassDescriptor.depthStencilAttachment} 纹理上获取。
 */
export interface IDepthStencilState extends Omit<IGPUDepthStencilState, "format" | "depthWriteEnabled" | "depthCompare">
{
    /**
     * Indicates if this {@link GPURenderPipeline} can modify
     * {@link GPURenderPassDescriptor#depthStencilAttachment} depth values.
     *
     * 默认为 `true` 。
     */
    depthWriteEnabled?: boolean;

    /**
     * The comparison operation used to test fragment depths against
     * {@link GPURenderPassDescriptor#depthStencilAttachment} depth values.
     *
     * 默认 `'less'` 。
     */
    depthCompare?: GPUCompareFunction;
}
