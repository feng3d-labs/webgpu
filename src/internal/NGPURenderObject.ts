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