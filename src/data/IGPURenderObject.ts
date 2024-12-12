import { IRenderObject } from "@feng3d/render-api";
import { IGPUBindingResources } from "./IGPUBindingResources";
import { IGPUDrawIndexed } from "./IGPUDrawIndexed";
import { IGPUDrawVertex } from "./IGPUDrawVertex";
import { IGPUVertexAttributes } from "./IGPUVertexAttributes";

declare module "@feng3d/render-api"
{
    /**
     * 渲染对象，包含一次渲染时包含的所有数据。
     */
    export interface IRenderObject
    {
        /**
         * 数据类型。
         */
        readonly __type?: "RenderObject";

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
}

/**
 * 顶点索引数据类型。
 */
export type IGPUIndicesDataTypes = Uint16Array | Uint32Array;


