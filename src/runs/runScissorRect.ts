import { IGPUScissorRect } from "../data/IGPURenderObject";

export function runScissorRect(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, scissorRect?: IGPUScissorRect)
{
    if (!scissorRect) return;
    if (passEncoder["_scissorRect"] === scissorRect) return;

    let { fromWebGL, x, y, width, height } = scissorRect;
    if (fromWebGL)
    {
        y = attachmentSize.height - y - height
    }

    passEncoder.setScissorRect(x, y, width, height);

    //
    passEncoder["_scissorRect"] = scissorRect;
}