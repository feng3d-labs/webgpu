import { IGPUScissorRect } from "../data/IGPURenderObject";

export function runScissorRect(passEncoder: GPURenderPassEncoder, scissorRect?: IGPUScissorRect)
{
    if (!scissorRect) return;

    const { x, y, width, height } = scissorRect;
    passEncoder.setScissorRect(x, y, width, height);
}