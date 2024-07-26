import { IGPUBindingResources } from "./IGPUBindingResources";
import { IGPURenderObject, IGPURenderPipeline } from "./IGPURenderObject";
import { IVertexAttributes } from "./IVertexAttributes";
import { IIndexBuffer } from "./IndexBuffer";

/**
 * 可渲染对象。
 */
export interface IRenderObject extends Omit<IGPURenderObject, "pipeline" | "indexBuffer" | "vertexBuffers" | "bindGroups">
{
    pipeline: IGPURenderPipeline;

    /**
     * 顶点属性数据映射。
     */
    vertices?: IVertexAttributes;

    /**
     * GPU绘制时使用的索引缓冲区。
     */
    index?: IIndexBuffer,

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    bindingResources?: IGPUBindingResources;
}
