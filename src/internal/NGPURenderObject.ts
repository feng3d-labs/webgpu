export interface NGPURenderObject
{
    readonly pipeline: GPURenderPipeline;
    readonly setBindGroups: NGPUSetBindGroup[];
}

export interface NGPUSetBindGroup
{
    bindGroup: GPUBindGroup;
    dynamicOffsets: number[];
}