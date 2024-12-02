import { IGPUVertexState } from "../data/IGPURenderObject";

export interface NGPUVertexState extends IGPUVertexState
{
    /**
     * A list of {@link GPUVertexBufferLayout}s defining the layout of the vertex attribute data in the
     * vertex buffers used by this pipeline.
     *
     * 自动根据反射信息生成，不用设置。
     */
    readonly buffers?: GPUVertexBufferLayout[];
}
