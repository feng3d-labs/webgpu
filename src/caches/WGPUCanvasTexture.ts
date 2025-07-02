import { effect, reactive } from '@feng3d/reactivity';
import { CanvasTexture, ChainMap } from '@feng3d/render-api';
import { webgpuEvents } from '../eventnames';
import { GPUCanvasContextManager } from './GPUCanvasContextManager';

export class WGPUCanvasTexture
{
    static getInstance(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        let result = this.textureMap.get([device, canvasTexture]);

        if (result) return result;

        result = new WGPUCanvasTexture(device, canvasTexture);

        this.textureMap.set([device, canvasTexture], result);

        return result;
    }
    private static readonly textureMap = new ChainMap<[GPUDevice, CanvasTexture], WGPUCanvasTexture>();

    constructor(private device: GPUDevice, private texture: CanvasTexture)
    {
        this.init();
    }

    get gpuTexture()
    {
        if (this.gpuTextureInvalid)
        {
            this._gpuTexture = this.getGPUTexture();
            reactive(this).gpuTextureInvalid = false;
        }

        return this._gpuTexture;
    }

    private _gpuTexture: GPUTexture;

    readonly gpuTextureInvalid: boolean = true;

    init()
    {
        const r_this = reactive(this);
        const canvasTexture = this.texture;

        const r_webgpuEvents = reactive(webgpuEvents);
        const r_canvasTexture = reactive(canvasTexture);

        effect(() =>
        {
            if (r_this.gpuTextureInvalid) return;

            r_webgpuEvents.preSubmit;
            r_canvasTexture._canvasSizeVersion;

            //
            r_this.gpuTextureInvalid = true;
        });

        effect(() =>
        {
            r_this.gpuTextureInvalid;

            if (!this.gpuTextureInvalid) return;
            if (!this._gpuTexture) return;

            this._gpuTexture.destroy();
            this._gpuTexture = null;
        });
    }

    getGPUTexture()
    {
        const { device, texture } = this;

        const context = GPUCanvasContextManager.getGPUCanvasContext(device, texture.context);

        const gpuTexture = context.getCurrentTexture();

        gpuTexture.label = 'GPU画布纹理';

        return gpuTexture;
    }

}