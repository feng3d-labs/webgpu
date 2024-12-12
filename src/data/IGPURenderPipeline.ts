import { IRenderPipeline } from "@feng3d/render-api";
import { IGPUDepthStencilState } from "./IGPUDepthStencilState";
import { IGPUFragmentState } from "./IGPUFragmentState";
import { IGPUMultisampleState } from "./IGPUMultisampleState";
import { IGPUVertexState } from "./IGPUVertexState";

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
         * 描述顶点着色器源码入口点以及顶点属性缓冲区布局。
         */
        readonly vertex: IGPUVertexState;

        /**
         * 片段着色器阶段描述。
         */
        readonly fragment?: IGPUFragmentState;

        /**
         * 深度模板阶段描述。
         */
        readonly depthStencil?: IGPUDepthStencilState;

        /**
         * 多重采样阶段描述。
         */
        readonly multisample?: IGPUMultisampleState;
    }

}
