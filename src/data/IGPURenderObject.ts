import { IGPUBindingResources } from "./IGPUBindingResources";
import { IGPUDrawIndexed } from "./IGPUDrawIndexed";
import { IGPUDrawVertex } from "./IGPUDrawVertex";
import { IGPURenderPipeline } from "./IGPURenderPipeline";
import { IGPUVertexAttributes } from "./IGPUVertexAttributes";

/**
 * GPU渲染对象，包含一次渲染时包含的所有数据。
 */
export interface IGPURenderObject
{
    /**
     * 数据类型。
     */
    readonly __type?: "RenderObject";

    /**
     * GPU渲染管线描述。
     */
    readonly pipeline: IGPURenderPipeline;

    /**
     * 顶点属性数据映射。
     */
    readonly vertices?: IGPUVertexAttributes;

    /**
     * 顶点索引数据。
     */
    readonly indices?: IGPUIndicesDataTypes;

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    readonly bindingResources?: IGPUBindingResources;

    /**
     * 根据顶点数据绘制图元。
     */
    readonly drawVertex?: IGPUDrawVertex;

    /**
     * 根据索引数据绘制图元。
     */
    readonly drawIndexed?: IGPUDrawIndexed;
}

/**
 * 顶点索引数据类型。
 */
export type IGPUIndicesDataTypes = Uint16Array | Uint32Array;


