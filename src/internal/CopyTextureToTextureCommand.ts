import { CopyTextureToTexture } from '@feng3d/render-api';
import { WebGPU } from '../WebGPU';

export class CopyTextureToTextureCommand
{
    static getInstance(webgpu: WebGPU, passEncoder: CopyTextureToTexture)
    {
        return new CopyTextureToTextureCommand(webgpu, passEncoder);
    }

    constructor(public readonly webgpu: WebGPU, public readonly copyTextureToTexture: CopyTextureToTexture)
    {
        const device = this.webgpu.device;

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

    run(commandEncoder: GPUCommandEncoder)
    {
        const { source, destination, copySize } = this;

        commandEncoder.copyTextureToTexture(
            source,
            destination,
            copySize,
        );
    }

    source: GPUImageCopyTexture;
    destination: GPUImageCopyTexture;
    copySize: GPUExtent3DStrict;
}