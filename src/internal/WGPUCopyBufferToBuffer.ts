import { reactive } from '@feng3d/reactivity';
import { CopyBufferToBuffer } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WebGPU } from '../WebGPU';
import { WGPUBuffer } from '../caches/WGPUBuffer';
import { GDeviceContext } from './GDeviceContext';

export class WGPUCopyBufferToBuffer extends ReactiveObject
{
    static getInstance(webgpu: WebGPU, copyBufferToBuffer: CopyBufferToBuffer)
    {
        return new WGPUCopyBufferToBuffer(webgpu, copyBufferToBuffer);
    }

    constructor(webgpu: WebGPU, copyBufferToBuffer: CopyBufferToBuffer)
    {
        super();

        this._onCreate(webgpu.device, copyBufferToBuffer);
        this._onMap(webgpu.device, copyBufferToBuffer);
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
            const sourceBuffer = WGPUBuffer.getInstance(device, copyBufferToBuffer.source);
            reactive(sourceBuffer).gpuBuffer;
            source = sourceBuffer.gpuBuffer;

            //
            sourceOffset = copyBufferToBuffer.sourceOffset ?? 0;

            //
            const destinationBuffer = WGPUBuffer.getInstance(device, copyBufferToBuffer.destination);
            reactive(destinationBuffer).gpuBuffer;
            destination = destinationBuffer.gpuBuffer;

            //
            destinationOffset = copyBufferToBuffer.destinationOffset ?? 0;

            //
            size = copyBufferToBuffer.size ?? source.size;
        });

        this.run = (context: GDeviceContext) =>
        {
            context.gpuCommandEncoder.copyBufferToBuffer(
                source, sourceOffset, destination, destinationOffset, size,
            );
        }
    }

    private _onMap(device: GPUDevice, copyBufferToBuffer: CopyBufferToBuffer)
    {
        device.copyBufferToBuffers ??= new WeakMap<CopyBufferToBuffer, WGPUCopyBufferToBuffer>();
        device.copyBufferToBuffers.set(copyBufferToBuffer, this);
        this.destroyCall(() => { device.copyBufferToBuffers.delete(copyBufferToBuffer); });
    }

    run: (context: GDeviceContext) => void;
}

declare global
{
    interface GPUDevice
    {
        copyBufferToBuffers: WeakMap<CopyBufferToBuffer, WGPUCopyBufferToBuffer>;
    }
}