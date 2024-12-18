import { IRenderObject } from "@feng3d/render-api";
import { IGPUBindingResources } from "./IGPUBindingResources";

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
    }

    /**
     * Sets the viewport used during the rasterization stage to linearly map from NDC|normalized device coordinates to viewport coordinates.
     *
     * GPU绘制时视口尺寸。
     *
     * {@link GPURenderPassEncoder.setViewport}
     */
    export interface IViewport
    {
        /**
         * 数据是否来着WebGL。
         *
         * WebGL以左下角为起始点，WebGPU以左上角为起点。
         */
        readonly fromWebGL?: boolean;

        /**
         * Minimum depth value of the viewport.
         * 
         * 0.0 ≤ minDepth ≤ 1.0 并且 minDepth ≤ maxDepth
         * 
         * 默认为 0 。
         */
        readonly minDepth: number,

        /**
         * Maximum depth value of the viewport.
         * 
         * 0.0 ≤ maxDepth ≤ 1.0 并且 minDepth ≤ maxDepth
         * 
         * 默认为 1 。
         */
        readonly maxDepth: number
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


    /**
     * 根据索引数据绘制图元。
     *
     * {@link GPURenderCommandsMixin.drawIndexed}
     */
    export interface IDrawIndexed
    {
        /**
         * Added to each index value before indexing into the vertex buffers.
         * 
         * 默认为 0 。
         */
        readonly baseVertex?: number;

        /**
         * First instance to draw.
         * 
         * 默认为 0 。
         */
        readonly firstInstance?: number;
    }
}
