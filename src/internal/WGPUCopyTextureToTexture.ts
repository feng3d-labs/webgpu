import { ChainMap, CopyTextureToTexture } from '@feng3d/render-api';
import { WGPUTextureLike } from '../caches/WGPUTextureLike';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUCopyTextureToTexture extends ReactiveObject
{
    run: (device: GPUDevice, commandEncoder: GPUCommandEncoder) => void;

    constructor(device: GPUDevice, copyTextureToTexture: CopyTextureToTexture)
    {
        super();
        this._onCreate(device, copyTextureToTexture);
        //
        WGPUCopyTextureToTexture.map.set([device, copyTextureToTexture], this);
        this.destroyCall(() => { WGPUCopyTextureToTexture.map.delete([device, copyTextureToTexture]); });
    }

    private _onCreate(device: GPUDevice, copyTextureToTexture: CopyTextureToTexture)
    {
        this.run = (device: GPUDevice, commandEncoder: GPUCommandEncoder) =>
        {
            const sourceTexture = WGPUTextureLike.getInstance(device, copyTextureToTexture.source.texture);
            const gpuSourceTexture = sourceTexture.gpuTexture;

            const destinationTexture = WGPUTextureLike.getInstance(device, copyTextureToTexture.destination.texture);
            const gpuDestinationTexture = destinationTexture.gpuTexture;

            const source: GPUTexelCopyTextureInfo = {
                ...copyTextureToTexture.source,
                texture: gpuSourceTexture,
            };

            const destination: GPUTexelCopyTextureInfo = {
                ...copyTextureToTexture.destination,
                texture: gpuDestinationTexture,
            };

            commandEncoder.copyTextureToTexture(source, destination, copyTextureToTexture.copySize);
        }
    }

    static getInstance(device: GPUDevice, copyTextureToTexture: CopyTextureToTexture)
    {
        return this.map.get([device, copyTextureToTexture]) || new WGPUCopyTextureToTexture(device, copyTextureToTexture);
    }
    static readonly map = new ChainMap<[GPUDevice, CopyTextureToTexture], WGPUCopyTextureToTexture>();
}
