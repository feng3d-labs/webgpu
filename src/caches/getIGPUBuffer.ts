import { Buffer, IVertexDataTypes, TypedArray, UnReadonly } from "@feng3d/render-api";

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

export function getIGPUVertexBuffer(data: IVertexDataTypes)
{
    const buffer = getIGPUBuffer(data);
    (buffer as any).label = buffer.label || (`顶点属性 ${autoVertexIndex++}`);

    return buffer;
}
let autoVertexIndex = 0;

export function getIGPUIndexBuffer(data: Uint16Array | Uint32Array)
{
    const buffer = getIGPUBuffer(data);
    (buffer as UnReadonly<Buffer>).label = buffer.label || (`顶点索引 ${autoIndex++}`);

    return buffer;
}
let autoIndex = 0;