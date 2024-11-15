import { IGPUViewport } from "../data/IGPURenderObject";

export function runViewport(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, viewport?: IGPUViewport)
{
    if (!viewport) return;

    let { fromWebGL, x, y, width, height, minDepth, maxDepth } = viewport;
    if (fromWebGL)
    {
        y = attachmentSize.height - y - height
    }
    passEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
}