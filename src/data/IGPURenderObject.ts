import { IRenderObject } from "@feng3d/render-api";
import { IGPUBindingResources } from "./IGPUBindingResources";
import { IGPUDrawIndexed } from "./IGPUDrawIndexed";

declare module "@feng3d/render-api"
{
    /**
     * 渲染对象，包含一次渲染时包含的所有数据。
     */
    export interface IRenderObject
    {
        /**
         * 绑定资源。包含数值、纹理、采样、外部纹理。
         */
        readonly bindingResources?: IGPUBindingResources;

        /**
         * 根据索引数据绘制图元。
         */
        readonly drawIndexed?: IGPUDrawIndexed;
    }

    /**
     * Draws primitives.
     *
     * 根据顶点数据绘制图元。
     *
     * @see GPURenderCommandsMixin.draw
     */
    export interface IDrawVertex
    {
        /**
         * First instance to draw.
         */
        readonly firstInstance?: number;
    }
}
