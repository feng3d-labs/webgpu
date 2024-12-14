import { IColor } from "@feng3d/render-api";
import { IGPUDrawIndexed } from "../data/IGPUDrawIndexed";
import { IGPUDrawVertex } from "../data/IGPUDrawVertex";

export interface NGPURenderObject
{
    readonly pipeline: GPURenderPipeline;
    readonly setBindGroups: NGPUSetBindGroup[];
    readonly vertexBuffers: NGPUVertexBuffer1[];
    readonly setIndexBuffer: NGPUSetIndexBuffer;
    readonly drawVertex?: IGPUDrawVertex;
    readonly drawIndexed?: IGPUDrawIndexed;

    /**
     * 如果任意模板测试结果使用了 "replace" 运算，则需要再渲染前设置 `stencilReference` 值。
     */
    readonly stencilReference: number;

    /**
     * 当混合系数用到了混合常量值时设置混合常量值。
     */
    readonly blendConstantColor: IColor;
}

export interface NGPUSetBindGroup
{
    readonly bindGroup: GPUBindGroup;
    readonly dynamicOffsets: number[];
}

export interface NGPUVertexBuffer1
{
    readonly gBuffer: GPUBuffer;
    readonly offset: number;
    readonly size: number;
}

export interface NGPUSetIndexBuffer
{
    gBuffer: GPUBuffer;
    indexFormat: GPUIndexFormat;
    offset: number;
    size: number;
}