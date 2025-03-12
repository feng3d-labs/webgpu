import { Buffer, TypedArray } from "@feng3d/render-api";

export function getIGPUBuffer(bufferSource: TypedArray)
{
    let arrayBuffer = bufferSource as ArrayBuffer;
    if ((bufferSource as ArrayBufferView).buffer)
    {
        arrayBuffer = (bufferSource as ArrayBufferView).buffer;
    }

    const gpuBuffer: Buffer = arrayBuffer["_IGPUBuffer"] = arrayBuffer["_IGPUBuffer"] || {
        size: Math.ceil(arrayBuffer.byteLength / 4) * 4,
        data: arrayBuffer,
    };

    return gpuBuffer;
}

