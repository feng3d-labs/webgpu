import { IGPUVertexState } from "../data/IGPUVertexState";

/**
 * 内部对象。
 */
export interface NGPUVertexState extends IGPUVertexState
{
    readonly entryPoint: string;
    readonly constants: Readonly<Record<
        string,
        GPUPipelineConstantValue
    >>;

    /**
     * A list of {@link GPUVertexBufferLayout}s defining the layout of the vertex attribute data in the
     * vertex buffers used by this pipeline.
     *
     * 自动根据反射信息生成，不用设置。
     */
    readonly buffers: GPUVertexBufferLayout[];
}
