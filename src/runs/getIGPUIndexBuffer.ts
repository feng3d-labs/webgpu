import { IGPUBuffer } from "../data/IGPUBuffer";
import { IGPUIndexBuffer } from "../data/IGPURenderObject";

export function getIGPUIndexBuffer(index: Uint16Array | Uint32Array)
{
    const indexBuffer: IGPUIndexBuffer = index["_IGPUIndexBuffer"] = index["_IGPUIndexBuffer"] || {
        buffer: getIGPUBuffer(index),
        indexFormat: index.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16",
        offset: index.byteOffset,
        size: index.byteLength,
    };

    return indexBuffer;
}

export function getIGPUBuffer(bufferSource: BufferSource)
{
    let arrayBuffer = bufferSource as ArrayBuffer;
    if ((bufferSource as ArrayBufferView).buffer)
    {
        arrayBuffer = (bufferSource as ArrayBufferView).buffer;
    }

    const gpuBuffer: IGPUBuffer = arrayBuffer["_IGPUBuffer"] = arrayBuffer["_IGPUBuffer"] || {
        label: "顶点索引 " + autoIndex++,
        size: arrayBuffer.byteLength,
        data: arrayBuffer,
    };

    return gpuBuffer;
}
let autoIndex = 0;