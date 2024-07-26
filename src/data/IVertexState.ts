import { IGPUVertexState } from "../webgpu-data-driven/data/IGPURenderObject";

/**
 * 描述顶点着色器源码入口点以及顶点属性缓冲区布局。
 *
 * 顶点属性缓冲区布局将由给出顶点数据自动生成。
 */
export interface IVertexState extends Omit<IGPUVertexState, "entryPoint" | "buffers">
{
    /**
     * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
     * perform its work.
     *
     * 入口函数可选。默认从着色器中进行反射获取。
     */
    entryPoint?: string;
}
