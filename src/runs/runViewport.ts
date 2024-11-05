import { IGPUViewport } from "../data/IGPURenderObject";

export function runViewport(passEncoder: GPURenderPassEncoder, viewport?: IGPUViewport)
{
    if (!viewport) return;

    const { x, y, width, height, minDepth, maxDepth } = viewport;
    passEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
}