import { IUniforms } from "@feng3d/render-api";
import { } from "./IGPUBindingResources";

declare module "@feng3d/render-api"
{
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
