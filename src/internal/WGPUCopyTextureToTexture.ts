import { reactive } from '@feng3d/reactivity';
import { CopyTextureToTexture, TextureSize } from '@feng3d/render-api';
import { WGPUTextureLike } from '../caches/WGPUTextureLike';
import { ReactiveObject } from '../ReactiveObject';
import { GDeviceContext } from './GDeviceContext';

export class WGPUCopyTextureToTexture extends ReactiveObject
{
    run: (context: GDeviceContext) => void;

    constructor(device: GPUDevice, copyTextureToTexture: CopyTextureToTexture)
    {
        super();
        this._onCreate(device, copyTextureToTexture);
        this._onMap(device, copyTextureToTexture);
    }

    private _onCreate(device: GPUDevice, copyTextureToTexture: CopyTextureToTexture)
    {
        let source: GPUTexelCopyTextureInfo;
        let destination: GPUTexelCopyTextureInfo;
        let copySize: TextureSize;

        this.effect(() =>
        {
            const sourceTexture = WGPUTextureLike.getInstance(device, copyTextureToTexture.source.texture);
            reactive(sourceTexture).gpuTexture;
            const gpuSourceTexture = sourceTexture.gpuTexture;

            const destinationTexture = WGPUTextureLike.getInstance(device, copyTextureToTexture.destination.texture);
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

    private _onMap(device: GPUDevice, copyTextureToTexture: CopyTextureToTexture)
    {
        device.copyTextureToTextures ??= new WeakMap<CopyTextureToTexture, WGPUCopyTextureToTexture>();
        device.copyTextureToTextures.set(copyTextureToTexture, this);
        this.destroyCall(() => { device.copyTextureToTextures.delete(copyTextureToTexture); });
    }

    static getInstance(device: GPUDevice, copyTextureToTexture: CopyTextureToTexture)
    {
        return device.copyTextureToTextures?.get(copyTextureToTexture) || new WGPUCopyTextureToTexture(device, copyTextureToTexture);
    }
}

declare global
{
    interface GPUDevice
    {
        copyTextureToTextures: WeakMap<CopyTextureToTexture, WGPUCopyTextureToTexture>;
    }
}