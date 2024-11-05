import { IGPUDrawIndexed } from "../data/IGPURenderObject";

export function runDrawIndexed(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, drawIndexed?: IGPUDrawIndexed)
{
    if (!drawIndexed) return;
    const { indexCount, instanceCount, firstIndex, baseVertex, firstInstance } = drawIndexed;
    passEncoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
}