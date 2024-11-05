import { IGPUDraw } from "../data/IGPURenderObject";

export function runDraw(passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, draw?: IGPUDraw)
{
    if (!draw) return;

    const { vertexCount, instanceCount, firstVertex, firstInstance } = draw;
    passEncoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
}