import { IGPUBuffer } from "../data/IGPUBuffer";
import { IGPUIndexBuffer } from "../data/IGPURenderObject";

export function getIGPUIndexBuffer(index: Uint16Array | Uint32Array)
{
    const arrayBuffer: ArrayBuffer = index.buffer;

    const gpuBuffer: IGPUBuffer = arrayBuffer["_IGPUBuffer"] = arrayBuffer["_IGPUBuffer"] || {
        label: "顶点索引 " + autoIndex++,
        size: arrayBuffer.byteLength,
        data: arrayBuffer,
    };

    const indexBuffer: IGPUIndexBuffer = index["_IGPUIndexBuffer"] = index["_IGPUIndexBuffer"] || {
        buffer: gpuBuffer,
        indexFormat: index.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16",
        offset: index.byteOffset,
        size: index.byteLength,
    };

    return indexBuffer;
}

let autoIndex = 0;