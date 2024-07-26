import { IGPUBindGroup } from './IGPUBindGroup';
import { IGPUBuffer } from './IGPUBuffer';
import { IGPUPipelineLayout } from './IGPUPipelineLayout';
import { IGPUVertexBuffer } from './IGPUVertexBuffer';

/**
 * GPU渲染对象，包含一次渲染时包含的所有数据。
 */
export interface IGPURenderObject
{
    /**
     * GPU渲染管线描述。
     */
    pipeline: IGPURenderPipeline;

    /**
     * GPU绘制时使用的绑定组。
     */
    bindGroups?: IGPUSetBindGroup[],

    /**
     * GPU绘制时使用的顶点缓冲区列表。
     */
    vertexBuffers?: IGPUVertexBuffer[],

    /**
     * GPU绘制时使用的索引缓冲区。
     */
    indexBuffer?: IGPUSetIndexBuffer,

    /**
     * GPU绘制时视口尺寸。
     *
     * @see GPURenderPassEncoder.setViewport
     */
    viewport?: IGPUViewport;

    /**
     * GPU绘制时视口尺寸。
     *
     * @see GPURenderPassEncoder.setScissorRect
     */
    scissorRect?: IGPUScissorRect;

    /**
     * 绘制图元相关参数。
     */
    draw?: IGPUDraw;

    /**
     * 根据索引数据绘制图元相关参数。
     */
    drawIndexed?: IGPUDrawIndexed;
}

/**
 * 根据索引数据绘制图元相关参数。
 *
 * {@link GPURenderCommandsMixin.drawIndexed}
 */
export interface IGPUDrawIndexed
{
    /**
     * The number of indices to draw.
     */
    indexCount: number;

    /**
     * The number of instances to draw.
     */
    instanceCount?: number;

    /**
     * Offset into the index buffer, in indices, begin drawing from.
     */
    firstIndex?: number;

    /**
     * Added to each index value before indexing into the vertex buffers.
     */
    baseVertex?: number;

    /**
     * First instance to draw.
     */
    firstInstance?: number;
}

/**
 * Draws primitives.
 *
 * 绘制图元相关参数。
 *
 * @see GPURenderCommandsMixin.draw
 */
export interface IGPUDraw
{
    /**
     * The number of vertices to draw.
     */
    vertexCount: number;

    /**
     * The number of instances to draw.
     */
    instanceCount?: number;

    /**
     * Offset into the vertex buffers, in vertices, to begin drawing from.
     */
    firstVertex?: number;

    /**
     * First instance to draw.
     */
    firstInstance?: number;
}

/**
 * Sets the scissor rectangle used during the rasterization stage. After transformation into viewport coordinates any fragments which fall outside the scissor rectangle will be discarded.
 *
 * GPU绘制时视口尺寸。
 *
 * {@link GPURenderPassEncoder.setScissorRect}
 */
export interface IGPUScissorRect
{
    /**
     * Minimum X value of the scissor rectangle in pixels.
     */
    x: GPUIntegerCoordinate,

    /**
     * Minimum Y value of the scissor rectangle in pixels.
     */
    y: GPUIntegerCoordinate,

    /**
     * Width of the scissor rectangle in pixels.
     */
    width: GPUIntegerCoordinate,

    /**
     * Height of the scissor rectangle in pixels.
     */
    height: GPUIntegerCoordinate
}

/**
 * Sets the viewport used during the rasterization stage to linearly map from NDC|normalized device coordinates to viewport coordinates.
 *
 * GPU绘制时视口尺寸。
 *
 * {@link GPURenderPassEncoder.setViewport}
 */
export interface IGPUViewport
{
    /**
     * Minimum X value of the viewport in pixels.
     */
    x: number,

    /**
     * Minimum Y value of the viewport in pixels.
     */
    y: number,

    /**
     * Width of the viewport in pixels.
     */
    width: number,

    /**
     * Height of the viewport in pixels.
     */
    height: number,

    /**
     * Minimum depth value of the viewport.
     */
    minDepth: number,

    /**
     * Maximum depth value of the viewport.
     */
    maxDepth: number
}

/**
 * GPU渲染时使用的绑定组。
 *
 * {@link GPUBindingCommandsMixin.setBindGroup}
 */
export interface IGPUSetBindGroup
{
    /**
     * GPU绑定组。
     *
     * Bind group to use for subsequent render or compute commands.
     */
    bindGroup: IGPUBindGroup;

    /**
     * Array containing buffer offsets in bytes for each entry in `bindGroup` marked as {@link GPUBindGroupLayoutEntry#buffer}.{@link GPUBufferBindingLayout#hasDynamicOffset}.-->
     */
    dynamicOffsets?: number[];
}

/**
 * GPU渲染时使用的索引缓冲区。
 *
 * {@link GPURenderCommandsMixin.setIndexBuffer}
 */
export interface IGPUSetIndexBuffer
{
    /**
     * Buffer containing index data to use for subsequent drawing commands.
     *
     * 顶点索引缓冲区，包含提供给后续绘制命令使用的顶点索引数据。
     */
    buffer: IGPUBuffer;

    /**
     * Format of the index data contained in `buffer`.
     *
     * 缓冲区中提供的顶点索引数据格式。
     */
    indexFormat: GPUIndexFormat;

    /**
     * Offset in bytes into `buffer` where the index data begins. Defaults to `0`.
     *
     * 索引数据在缓冲区中的起始偏移值。默认为 `0` 。
     */
    offset?: number;

    /**
     * Size in bytes of the index data in `buffer`. Defaults to the size of the buffer minus the offset.
     *
     * 索引数据在缓冲区中所占字节尺寸。默认为缓冲区尺寸减去起始偏移值。
     */
    size?: number;
}

/**
 * GPU渲染管线描述。
 *
 * {@link GPURenderPipelineDescriptor}
 */
export interface IGPURenderPipeline extends Omit<GPURenderPipelineDescriptor, 'layout' | 'vertex' | 'primitive' | 'depthStencil' | 'multisample' | 'fragment'>
{
    /**
     * The {@link GPUPipelineLayout} for this pipeline or {@link GPUAutoLayoutMode#"auto"}, to generate
     * the pipeline layout automatically.
     * Note: If {@link GPUAutoLayoutMode#"auto"} is used the pipeline cannot share {@link GPUBindGroup}s
     * with any other pipelines.
     *
     * 默认 'auto' 。
     */
    layout?: IGPUPipelineLayout | 'auto';

    /**
     * Describes the vertex shader entry point of the pipeline and its input buffer layouts.
     */
    vertex: IGPUVertexState;

    /**
     * Describes the primitive-related properties of the pipeline.
     */
    primitive?: IGPUPrimitiveState;

    /**
     * Describes the optional depth-stencil properties, including the testing, operations, and bias.
     */
    depthStencil?: IGPUDepthStencilState;

    /**
     * Describes the multi-sampling properties of the pipeline.
     */
    multisample?: IGPUMultisampleState;

    /**
     * Describes the fragment shader entry point of the pipeline and its output colors. If
     * not map/exist|provided, the [[#no-color-output]] mode is enabled.
     */
    fragment?: IGPUFragmentState;
}

/**
 * 完整的深度模板阶段描述。
 */
export interface IGPUDepthStencilState extends GPUDepthStencilState
{

}

/**
 * 完整的多重采样阶段描述。
 */
export interface IGPUMultisampleState extends GPUMultisampleState
{

}

/**
 * {@link GPUPrimitiveState}
 */
export interface IGPUPrimitiveState extends GPUPrimitiveState
{
    /**
     * The type of primitive to be constructed from the vertex inputs.
     *
     * WebGPU 默认 `"triangle-list"` ,默认每三个顶点绘制一个三角形。
     */
    topology?: GPUPrimitiveTopology;

    /**
     * Defines which polygon orientation will be culled, if any.
     *
     * WebGPU 默认 `"none"` ,不进行剔除。
     */
    cullMode?: GPUCullMode;
}

/**
 * GPU顶点程序阶段。
 *
 * @see GPUVertexState
 */
export interface IGPUVertexState extends Omit<GPUVertexState, 'module' | 'buffers'>
{
    /**
     * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
     */
    code: string;

    /**
     * A list of {@link GPUVertexBufferLayout}s defining the layout of the vertex attribute data in the
     * vertex buffers used by this pipeline.
     */
    buffers?: GPUVertexBufferLayout[];
}

/**
 * GPU片元程序阶段。
 *
 * {@link GPUFragmentState}
 */
export interface IGPUFragmentState extends Omit<GPUFragmentState, 'module' | 'targets'>
{
    /**
     * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
     */
    code: string;

    /**
     * A list of {@link GPUColorTargetState} defining the formats and behaviors of the color targets
     * this pipeline writes to.
     */
    targets: GPUColorTargetState[];
}
