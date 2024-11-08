import { IGPUBindGroup } from "./IGPUBindGroup";
import { IGPUBindingResources } from "./IGPUBindingResources";
import { IGPUBuffer } from "./IGPUBuffer";
import { IGPUPipelineLayout } from "../internal/IGPUPipelineLayout";
import { IGPUVertexAttributes } from "./IGPUVertexAttributes";
import { IGPUVertexBuffer } from "./IGPUVertexBuffer";

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

    /**
     * 顶点属性数据映射。
     */
    vertices?: IGPUVertexAttributes;

    /**
     * GPU绘制时使用的索引缓冲区。
     */
    index?: IGPUIndexBuffer,

    /**
     * 绑定资源。包含数值、纹理、采样、外部纹理。
     */
    bindingResources?: IGPUBindingResources;
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
export interface IGPUIndexBuffer
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
export interface IGPURenderPipeline extends Omit<GPURenderPipelineDescriptor, "layout" | "vertex" | "primitive" | "depthStencil" | "multisample" | "fragment">
{
    /**
     * The {@link GPUPipelineLayout} for this pipeline or {@link GPUAutoLayoutMode#"auto"}, to generate
     * the pipeline layout automatically.
     * Note: If {@link GPUAutoLayoutMode#"auto"} is used the pipeline cannot share {@link GPUBindGroup}s
     * with any other pipelines.
     *
     * 默认 'auto' 。
     */
    layout?: IGPUPipelineLayout;

    /**
     * Describes the primitive-related properties of the pipeline.
     */
    primitive?: IGPUPrimitiveState;

    /**
     * 描述顶点着色器源码入口点以及顶点属性缓冲区布局。
     */
    vertex: IGPUVertexState;

    /**
     * 片段着色器阶段描述。
     */
    fragment?: IGPUFragmentState;

    /**
     * 深度模板阶段描述。
     */
    depthStencil?: IGPUDepthStencilState;

    /**
     * 多重采样阶段描述。
     */
    multisample?: IGPUMultisampleState;
}

/**
 * 深度模板阶段描述。
 *
 * `format` 将从深度附件 {@link IGPURenderPassDescriptor.depthStencilAttachment} 纹理上获取。
 */
export interface IGPUDepthStencilState extends Omit<GPUDepthStencilState, "format">
{
    /**
     * Indicates if this {@link GPURenderPipeline} can modify
     * {@link GPURenderPassDescriptor#depthStencilAttachment} depth values.
     *
     * 默认为 `true` 。
     */
    depthWriteEnabled?: boolean;

    /**
     * The comparison operation used to test fragment depths against
     * {@link GPURenderPassDescriptor#depthStencilAttachment} depth values.
     *
     * 默认 `'less'` 。
     */
    depthCompare?: GPUCompareFunction;
}

/**
 * 多重采样阶段描述。
 *
 * 多重采样次数将由 {@link IGPURenderPassDescriptor.multisample} 覆盖。
 */
export interface IGPUMultisampleState extends Omit<GPUMultisampleState, "count">
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
 * 描述顶点着色器源码入口点以及顶点属性缓冲区布局。
 *
 * 顶点属性缓冲区布局将由给出顶点数据自动生成。
 *
 * @see GPUVertexState
 */
export interface IGPUVertexState extends Omit<GPUVertexState, "module" | "buffers">
{
    /**
     * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
     */
    code: string;

    /**
     * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
     * perform its work.
     *
     * 入口函数可选。默认从着色器中进行反射获取。
     */
    entryPoint?: string;

    /**
     * A list of {@link GPUVertexBufferLayout}s defining the layout of the vertex attribute data in the
     * vertex buffers used by this pipeline.
     *
     * 自动根据反射信息生成，不用设置。
     */
    buffers?: GPUVertexBufferLayout[];
}

/**
 * GPU片元程序阶段。
 *
 * {@link GPUFragmentState}
 */
export interface IGPUFragmentState extends Omit<GPUFragmentState, "module" | "targets">
{
    /**
     * 着色器源码，将由 {@link GPUDevice.createShaderModule} 生成 {@link GPUShaderModule} 。
     */
    code: string;

    /**
     * The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
     * perform its work.
     *
     * 入口函数可选。默认从着色器中进行反射获取。
     */
    entryPoint?: string;

    /**
     * A list of {@link GPUColorTargetState} defining the formats and behaviors of the color targets
     * this pipeline writes to.
     */
    targets?: IGPUColorTargetState[];
}

/**
 * 属性 `format` 将由渲染通道中附件给出。
 */
export interface IGPUColorTargetState extends Omit<GPUColorTargetState, "format">
{
    /**
     * The {@link GPUTextureFormat} of this color target. The pipeline will only be compatible with
     * {@link GPURenderPassEncoder}s which use a {@link GPUTextureView} of this format in the
     * corresponding color attachment.
     *
     * 属性 `format` 将由渲染通道中附件给出。
     */
    format?: GPUTextureFormat;
}
