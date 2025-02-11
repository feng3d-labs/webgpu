import { getIGPUIndexBuffer } from "../caches/getIGPUBuffer";
import { IGPUSetIndexBuffer } from "./IGPUIndexBuffer";

export function getIGPUSetIndexBuffer(index: Uint16Array | Uint32Array)
{
    const indexBuffer: IGPUSetIndexBuffer = index["_IGPUIndexBuffer"] = index["_IGPUIndexBuffer"] || {
        buffer: getIGPUIndexBuffer(index),
        indexFormat: index.BYTES_PER_ELEMENT === 4 ? "uint32" : "uint16",
        offset: index.byteOffset,
        size: index.byteLength,
    };

    return indexBuffer;
}
