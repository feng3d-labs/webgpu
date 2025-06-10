import { CopyTextureToTexture } from '@feng3d/render-api';
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
        const sourceTexture = this.webgpu._textureManager.getGPUTexture(copyTextureToTexture.source.texture);
        const destinationTexture = this.webgpu._textureManager.getGPUTexture(copyTextureToTexture.destination.texture);

        this.source = {
            ...copyTextureToTexture.source,
            texture: sourceTexture,
        };

        this.destination = {
            ...copyTextureToTexture.destination,
            texture: destinationTexture,
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