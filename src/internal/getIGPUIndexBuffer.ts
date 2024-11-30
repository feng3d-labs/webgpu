import { getIGPUBuffer } from "../caches/getIGPUBuffer";
import { IGPUIndexBuffer } from "./IGPUIndexBuffer";

export function getIGPUIndexBuffer(index: Uint16Array | Uint32Array)
{
    const indexBuffer: IGPUIndexBuffer = index["_IGPUIndexBuffer"] = index["_IGPUIndexBuffer"] || {
        buffer: getIGPUBuffer(index),
        indexFormat: index.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16",
        offset: index.byteOffset,
        size: index.byteLength,
    };

    (indexBuffer.buffer as any).label = indexBuffer.buffer.label || ("顶点索引 " + autoIndex++);

    return indexBuffer;
}
let autoIndex = 0;