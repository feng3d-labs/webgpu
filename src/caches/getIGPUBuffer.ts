import { Buffer, TypedArray } from "@feng3d/render-api";

export function getGBuffer(bufferSource: TypedArray)
{
    let arrayBuffer = bufferSource as ArrayBuffer;
    if ((bufferSource as ArrayBufferView).buffer)
    {
        arrayBuffer = (bufferSource as ArrayBufferView).buffer;
    }

    let gpuBuffer = bufferMap.get(arrayBuffer);
    if (gpuBuffer) return gpuBuffer;

    gpuBuffer = {
        size: Math.ceil(arrayBuffer.byteLength / 4) * 4,
        data: bufferSource,
    };
    bufferMap.set(arrayBuffer, gpuBuffer);

    return gpuBuffer;
}

const bufferMap = new WeakMap<ArrayBuffer, Buffer>();