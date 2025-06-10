import { CopyBufferToBuffer } from '@feng3d/render-api';
import { WebGPU } from '../WebGPU';
import { GPUBufferManager } from '../caches/GPUBufferManager';
import { GDeviceContext } from './GDeviceContext';

export class CopyBufferToBufferCommand
{
    static getInstance(webgpu: WebGPU, copyBufferToBuffer: CopyBufferToBuffer)
    {
        return new CopyBufferToBufferCommand(webgpu, copyBufferToBuffer);
    }

    constructor(public readonly webgpu: WebGPU, public readonly copyBufferToBuffer: CopyBufferToBuffer)
    {
        const device = this.webgpu.device;

        this.source = GPUBufferManager.getGPUBuffer(device, copyBufferToBuffer.source);
        this.sourceOffset = copyBufferToBuffer.sourceOffset ?? 0;
        this.destination = GPUBufferManager.getGPUBuffer(device, copyBufferToBuffer.destination);
        this.destinationOffset = copyBufferToBuffer.destinationOffset ?? 0;
        this.size = copyBufferToBuffer.size ?? copyBufferToBuffer.source.size;
    }

    run(context: GDeviceContext)
    {
        const { source, sourceOffset, destination, destinationOffset, size } = this;

        context.gpuCommandEncoder.copyBufferToBuffer(
            source, sourceOffset, destination, destinationOffset, size,
        );
    }

    source: GPUBuffer;
    sourceOffset: number;
    destination: GPUBuffer;
    destinationOffset: number;
    size: number;
}