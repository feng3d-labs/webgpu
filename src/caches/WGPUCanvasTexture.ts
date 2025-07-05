import { reactive } from '@feng3d/reactivity';
import { CanvasContext, CanvasTexture, ChainMap } from '@feng3d/render-api';
import { webgpuEvents } from '../eventnames';
import { ReactiveClass } from '../ReactiveClass';
import { GPUCanvasContextManager } from './GPUCanvasContextManager';

export class WGPUCanvasTexture extends ReactiveClass
{
    readonly gpuTexture: GPUTexture;

    /**
     * 是否失效
     */
    readonly invalid: boolean = true;

    private readonly _device: GPUDevice;
    private readonly _canvasTexture: CanvasTexture;

    constructor(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        super();

        this._device = device;
        this._canvasTexture = canvasTexture;

        WGPUCanvasTexture._textureMap.set([device, canvasTexture], this);

        const r_this = reactive(this);

        {
            const r_canvasTexture = reactive(canvasTexture);
            const r_webgpuEvents = reactive(webgpuEvents);

            let preGPUTexture: GPUTexture;
            this.effect(() =>
            {
                if (!r_this.gpuTexture) return;

                r_webgpuEvents.preSubmit;
                r_canvasTexture._canvasSizeVersion;

                //
                if (preGPUTexture === this.gpuTexture)
                {
                    r_this.gpuTexture = null;
                }

                preGPUTexture = this.gpuTexture;
            });
        }

        // 监听纹理变化
        {
            let preGPUTexture: GPUTexture;
            this.effect(() =>
            {
                r_this.gpuTexture;

                preGPUTexture?.destroy();
                preGPUTexture = this.gpuTexture;

                if (!this.gpuTexture)
                {
                    r_this.invalid = true;
                }
            });
        }
    }

    update()
    {
        if (this.invalid) return;

        const r_this = reactive(this);

        if (!this.gpuTexture)
        {
            r_this.gpuTexture = WGPUCanvasTexture._getCanvasGPUTexture(this._device, this._canvasTexture.context);
        }

        r_this.invalid = true;
    }

    static _getCanvasGPUTexture(device: GPUDevice, canvasContext: CanvasContext)
    {
        const context = GPUCanvasContextManager.getGPUCanvasContext(device, canvasContext);

        const gpuTexture = context.getCurrentTexture();

        gpuTexture.label = 'GPU画布纹理';

        return gpuTexture;
    }

    destroy()
    {
        //
        WGPUCanvasTexture._textureMap.delete([this._device, this._canvasTexture]);

        super.destroy();
    }

    static getInstance(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        return this._textureMap.get([device, canvasTexture]) || new WGPUCanvasTexture(device, canvasTexture);
    }

    static destroy(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        this._textureMap.get([device, canvasTexture])?.destroy();
    }

    private static readonly _textureMap = new ChainMap<[GPUDevice, CanvasTexture], WGPUCanvasTexture>();
}