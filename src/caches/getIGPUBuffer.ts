import { IVertexDataTypes } from "@feng3d/render-api";
import { IGPUBuffer } from "../data/IGPUBuffer";

export function getIGPUBuffer(bufferSource: BufferSource)
{
    let arrayBuffer = bufferSource as ArrayBuffer;
    if ((bufferSource as ArrayBufferView).buffer)
    {
        arrayBuffer = (bufferSource as ArrayBufferView).buffer;
    }

    const gpuBuffer: IGPUBuffer = arrayBuffer["_IGPUBuffer"] = arrayBuffer["_IGPUBuffer"] || {
        size: arrayBuffer.byteLength,
        data: arrayBuffer,
    };

    return gpuBuffer;
}

export function getIGPUVertexBuffer(data: IVertexDataTypes)
{
    const buffer = getIGPUBuffer(data);
    (buffer as any).label = buffer.label || (`顶点属性 ${autoVertexIndex++}`);

    return buffer;
}
let autoVertexIndex = 0;