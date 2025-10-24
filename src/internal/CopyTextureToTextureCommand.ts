import { CopyTextureToTexture, TextureSize } from '@feng3d/render-api';
import { WGPUTextureLike } from '../caches/WGPUTextureLike';
import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';
import { reactive } from '@feng3d/reactivity';
import { ReactiveObject } from '../ReactiveObject';

export class CopyTextureToTextureCommand extends ReactiveObject
{
    static getInstance(webgpu: WebGPU, passEncoder: CopyTextureToTexture)
    {
        return new CopyTextureToTextureCommand(webgpu, passEncoder);
    }

    constructor(webgpu: WebGPU, copyTextureToTexture: CopyTextureToTexture)
    {
        super();
        this._onCreate(webgpu, copyTextureToTexture);
    }

    private _onCreate(webgpu: WebGPU, copyTextureToTexture: CopyTextureToTexture)
    {
        let source: GPUTexelCopyTextureInfo;
        let destination: GPUTexelCopyTextureInfo;
        let copySize: TextureSize;

        this.effect(() =>
        {
            const sourceTexture = WGPUTextureLike.getInstance(webgpu.device, copyTextureToTexture.source.texture);
            reactive(sourceTexture).gpuTexture;
            const gpuSourceTexture = sourceTexture.gpuTexture;

            const destinationTexture = WGPUTextureLike.getInstance(webgpu.device, copyTextureToTexture.destination.texture);
            reactive(destinationTexture).gpuTexture;
            const gpuDestinationTexture = destinationTexture.gpuTexture;

            source = {
                ...copyTextureToTexture.source,
                texture: gpuSourceTexture,
            };

            destination = {
                ...copyTextureToTexture.destination,
                texture: gpuDestinationTexture,
            };

            copySize = copyTextureToTexture.copySize;
        });

        this.run = (context: GDeviceContext) =>
        {
            context.gpuCommandEncoder.copyTextureToTexture(
                source,
                destination,
                copySize,
            );
        }
    }

    run: (context: GDeviceContext) => void;
}