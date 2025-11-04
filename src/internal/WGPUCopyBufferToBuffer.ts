import { CopyBufferToBuffer } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { getGPUBuffer } from '../caches/getGPUBuffer';

export class WGPUCopyBufferToBuffer extends ReactiveObject
{
    run: (device: GPUDevice, commandEncoder: GPUCommandEncoder) => void;

    constructor(device: GPUDevice, copyBufferToBuffer: CopyBufferToBuffer)
    {
        super();

        this._onCreate(device, copyBufferToBuffer);
        this._onMap(device, copyBufferToBuffer);
    }

    private _onCreate(device: GPUDevice, copyBufferToBuffer: CopyBufferToBuffer)
    {
        let source: GPUBuffer;
        let sourceOffset: number;
        let destination: GPUBuffer;
        let destinationOffset: number;
        let size: number;

        this.effect(() =>
        {
            //
            source = getGPUBuffer(device, copyBufferToBuffer.source);

            //
            sourceOffset = copyBufferToBuffer.sourceOffset ?? 0;

            //
            destination = getGPUBuffer(device, copyBufferToBuffer.destination);

            //
            destinationOffset = copyBufferToBuffer.destinationOffset ?? 0;

            //
            size = copyBufferToBuffer.size ?? source.size;
        });

        this.run = (device: GPUDevice, commandEncoder: GPUCommandEncoder) =>
        {
            commandEncoder.copyBufferToBuffer(source, sourceOffset, destination, destinationOffset, size);
        }
    }

    private _onMap(device: GPUDevice, copyBufferToBuffer: CopyBufferToBuffer)
    {
        device.copyBufferToBuffers ??= new WeakMap<CopyBufferToBuffer, WGPUCopyBufferToBuffer>();
        device.copyBufferToBuffers.set(copyBufferToBuffer, this);
        this.destroyCall(() => { device.copyBufferToBuffers.delete(copyBufferToBuffer); });
    }

    static getInstance(device: GPUDevice, copyBufferToBuffer: CopyBufferToBuffer)
    {
        return device.copyBufferToBuffers?.get(copyBufferToBuffer) || new WGPUCopyBufferToBuffer(device, copyBufferToBuffer);
    }
}

declare global
{
    interface GPUDevice
    {
        copyBufferToBuffers: WeakMap<CopyBufferToBuffer, WGPUCopyBufferToBuffer>;
    }
}