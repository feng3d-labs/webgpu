import { IVertexState } from "@feng3d/render-api";

/**
 * 内部对象。
 */
export interface NGPUVertexState extends IVertexState
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
