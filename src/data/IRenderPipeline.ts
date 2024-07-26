import { IGPUDepthStencilState, IGPUFragmentState, IGPUMultisampleState, IGPURenderPipeline, IGPUVertexState } from "./IGPURenderObject";

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
    fragment?: IGPUFragmentState;

    /**
     * 深度模板阶段描述。
     */
    depthStencil?: IGPUDepthStencilState;

    /**
     * 多重采样阶段描述。
     */
    multisample?: IGPUMultisampleState;
}

