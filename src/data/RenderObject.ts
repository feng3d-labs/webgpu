import { BindingResources } from './BindingResources';
import { DrawIndexed } from './DrawIndexed';
import { DrawVertex } from './DrawVertex';
import { RenderPipeline } from './RenderPipeline';
import { ScissorRect } from './ScissorRect';
import { VertexAttribute, VertexAttributes } from './VertexAttributes';
import { Viewport } from './Viewport';

/**
 * 渲染对象，包含一次渲染时包含的所有数据。
 */
export interface RenderObject
{
    /**
     * 数据类型。
     */
    __type__?: 'RenderObject';

    /**
     * 视窗。
     *
     * 描述渲染在画布的哪个区域，默认整个画布。
     */
    readonly viewport?: Viewport;

    /**
     * 光栅化阶段中使用的剪刀矩形。
     */
    readonly scissorRect?: ScissorRect;

    /**
     * 渲染管线描述。
     */
    readonly pipeline: RenderPipeline;

    /**
     * 顶点属性数据映射。
     */
    readonly vertices?: VertexAttributes;

    /**
     * 顶点索引数据。
     */
    readonly indices?: IndicesDataTypes;

    /**
     * 绘制。
     */
    readonly draw?: IDraw;

    /**
     * 绑定资源。
     *
     * 与着色器中名称对应的绑定资源（纹理、采样器、统一数据、存储数据等）。
     */
    readonly bindingResources?: BindingResources;
}

export class RenderObject
{
    /**
     * 获取顶点数量。
     *
     * @returns 顶点数量。
     */
    static getNumVertex(geometry: RenderObject)
    {
        const attributes = geometry.vertices;
        const vertexList = Object.keys(attributes).map((v) => attributes[v]).filter((v) => (v.data && v.stepMode !== 'instance'));

        const count = vertexList.length > 0 ? VertexAttribute.getVertexCount(vertexList[0]) : 0;

        // 验证所有顶点属性数据的顶点数量一致。
        if (vertexList.length > 0)
        {
            console.assert(vertexList.every((v) => count === VertexAttribute.getVertexCount(v)));
        }

        return count;
    }

    /**
     * 获取实例数量。
     *
     * @returns 实例数量。
     */
    static getInstanceCount(geometry: RenderObject)
    {
        const attributes = geometry.vertices;
        const vertexList = Object.keys(attributes).map((v) => attributes[v]).filter((v) => (v.data && v.stepMode === 'instance'));

        const count = vertexList.length > 0 ? VertexAttribute.getVertexCount(vertexList[0]) : 1;

        // 验证所有顶点属性数据的顶点数量一致。
        if (vertexList.length > 0)
        {
            console.assert(vertexList.every((v) => count === VertexAttribute.getVertexCount(v)));
        }

        return count;
    }

    static getDraw(geometry: RenderObject): DrawIndexed | DrawVertex
    {
        if (geometry['_draw']) return geometry['_draw'];

        const instanceCount = RenderObject.getInstanceCount(geometry);

        if (geometry.indices)
        {
            return {
                __type__: 'DrawIndexed',
                indexCount: geometry.indices.length,
                firstIndex: 0,
                instanceCount,
            };
        }

        return {
            __type__: 'DrawVertex',
            vertexCount: RenderObject.getNumVertex(geometry),
            instanceCount,
        };
    }
}

/**
 * 顶点索引数据类型。
 */
export type IndicesDataTypes = Uint16Array | Uint32Array;

/**
 * 绘制图形。
 */
export type IDraw = DrawVertex | DrawIndexed;

/**
 * Sets the viewport used during the rasterization stage to linearly map from NDC|normalized device coordinates to viewport coordinates.
 *
 * GPU绘制时视口尺寸。
 *
 * {@link GPURenderPassEncoder.setViewport}
 */
export interface Viewport
{
    /**
     * Minimum depth value of the viewport.
     *
     * 0.0 <= minDepth <= 1.0 并且 minDepth <= maxDepth
     *
     * 默认为 0 。
     */
    minDepth?: number,

    /**
     * Maximum depth value of the viewport.
     *
     * 0.0 <= maxDepth <= 1.0 并且 minDepth <= maxDepth
     *
     * 默认为 1 。
     */
    maxDepth?: number
}

/**
 * Draws primitives.
 *
 * 根据顶点数据绘制图元。
 *
 * @see GPURenderCommandsMixin.draw
 */
export interface DrawVertex
{
    /**
     * First instance to draw.
     *
     * 默认为 0 。
     */
    firstInstance?: number;
}

/**
 * 根据索引数据绘制图元。
 *
 * {@link GPURenderCommandsMixin.drawIndexed}
 */
export interface DrawIndexed
{
    /**
     * Added to each index value before indexing into the vertex buffers.
     *
     * 默认为 0 。
     */
    baseVertex?: number;

    /**
     * First instance to draw.
     *
     * 默认为 0 。
     */
    firstInstance?: number;
}
