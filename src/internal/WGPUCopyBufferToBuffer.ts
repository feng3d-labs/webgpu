import { ChainMap, CopyBufferToBuffer } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUBuffer } from '../caches/WGPUBuffer';

export class WGPUCopyBufferToBuffer extends ReactiveObject
{
    run: (device: GPUDevice, commandEncoder: GPUCommandEncoder) => void;

    constructor(device: GPUDevice, copyBufferToBuffer: CopyBufferToBuffer)
    {
        super();

        this._onCreate(device, copyBufferToBuffer);
        //
        WGPUCopyBufferToBuffer.map.set([device, copyBufferToBuffer], this);
        this.destroyCall(() => { WGPUCopyBufferToBuffer.map.delete([device, copyBufferToBuffer]); });
    }

    private _onCreate(device: GPUDevice, copyBufferToBuffer: CopyBufferToBuffer)
    {
        this.run = (device: GPUDevice, commandEncoder: GPUCommandEncoder) =>
        {
            //
            const sourceBuffer = WGPUBuffer.getInstance(device, copyBufferToBuffer.source);
            const source = sourceBuffer.gpuBuffer;

            //
            const sourceOffset = copyBufferToBuffer.sourceOffset ?? 0;

            //
            const destinationBuffer = WGPUBuffer.getInstance(device, copyBufferToBuffer.destination);
            const destination = destinationBuffer.gpuBuffer;

            //
            const destinationOffset = copyBufferToBuffer.destinationOffset ?? 0;

            //
            const size = copyBufferToBuffer.size ?? source.size;

            commandEncoder.copyBufferToBuffer(source, sourceOffset, destination, destinationOffset, size);
        }
    }

    static getInstance(device: GPUDevice, copyBufferToBuffer: CopyBufferToBuffer)
    {
        return this.map.get([device, copyBufferToBuffer]) || new WGPUCopyBufferToBuffer(device, copyBufferToBuffer);
    }
    static readonly map = new ChainMap<[GPUDevice, CopyBufferToBuffer], WGPUCopyBufferToBuffer>();

}
