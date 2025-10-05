import { reactive } from '@feng3d/reactivity';
import { VideoTexture } from '../data/VideoTexture';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUExternalTexture extends ReactiveObject
{
    readonly gpuExternalTexture: GPUExternalTexture;

    constructor(device: GPUDevice, videoTexture: VideoTexture)
    {
        super();

        this._onCreate(device, videoTexture);
        this._onMap(device, videoTexture);
    }

    private _onCreate(device: GPUDevice, videoTexture: VideoTexture)
    {
        const r_this = reactive(this);
        const r_queue = reactive(device.queue);
        const r_videoTexture = reactive(videoTexture);

        this.effect(() =>
        {
            // 在提交前确保收集到正确的外部纹理。
            r_queue.preSubmit;

            //
            r_videoTexture.label;
            r_videoTexture.source;
            r_videoTexture.colorSpace;

            //
            r_this.gpuExternalTexture = device.importExternalTexture(videoTexture);
        });

        this.destroyCall(() => { r_this.gpuExternalTexture = null; })
    }

    private _onMap(device: GPUDevice, videoTexture: VideoTexture)
    {
        device.externalTextures ??= new WeakMap<VideoTexture, WGPUExternalTexture>();
        device.externalTextures.set(videoTexture, this);
        this.destroyCall(() => { device.externalTextures.delete(videoTexture); });
    }

    static getInstance(device: GPUDevice, videoTexture: VideoTexture)
    {
        return device.externalTextures?.get(videoTexture) || new WGPUExternalTexture(device, videoTexture);
    }
}

declare global
{
    interface GPUDevice
    {
        externalTextures?: WeakMap<VideoTexture, WGPUExternalTexture>;
    }
}