import { CopyTextureToTexture } from '@feng3d/render-api';
import { WGPUTextureLike } from '../caches/WGPUTextureLike';
import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';

export class CopyTextureToTextureCommand
{
    static getInstance(webgpu: WebGPU, passEncoder: CopyTextureToTexture)
    {
        return new CopyTextureToTextureCommand(webgpu, passEncoder);
    }

    constructor(public readonly webgpu: WebGPU, public readonly copyTextureToTexture: CopyTextureToTexture)
    {
        const sourceTexture = WGPUTextureLike.getInstance(this.webgpu.device, copyTextureToTexture.source.texture);
        const destinationTexture = WGPUTextureLike.getInstance(this.webgpu.device, copyTextureToTexture.destination.texture);

        this.source = {
            ...copyTextureToTexture.source,
            texture: sourceTexture.gpuTexture,
        };

        this.destination = {
            ...copyTextureToTexture.destination,
            texture: destinationTexture.gpuTexture,
        };

        this.copySize = copyTextureToTexture.copySize;
    }

    run(context: GDeviceContext)
    {
        const { source, destination, copySize } = this;

        context.gpuCommandEncoder.copyTextureToTexture(
            source,
            destination,
            copySize,
        );
    }

    source: GPUImageCopyTexture;
    destination: GPUImageCopyTexture;
    copySize: GPUExtent3DStrict;
}