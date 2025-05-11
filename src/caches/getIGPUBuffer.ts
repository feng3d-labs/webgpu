import { Buffer, TypedArray } from "@feng3d/render-api";

export class BufferManager
{
    static getGBuffer(bufferSource: TypedArray)
    {
        let arrayBuffer = bufferSource as ArrayBuffer;
        if ((bufferSource as ArrayBufferView).buffer)
        {
            arrayBuffer = (bufferSource as ArrayBufferView).buffer;
        }

        let gpuBuffer = this.bufferMap.get(arrayBuffer);
        if (gpuBuffer) return gpuBuffer;

        gpuBuffer = {
            size: Math.ceil(arrayBuffer.byteLength / 4) * 4,
            data: bufferSource,
        };
        this.bufferMap.set(arrayBuffer, gpuBuffer);

        return gpuBuffer;
    }

    private static readonly bufferMap = new WeakMap<ArrayBuffer, Buffer>();

}