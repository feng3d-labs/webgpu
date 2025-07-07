import { effect, reactive } from '@feng3d/reactivity';
import { CanvasContext, ChainMap } from '@feng3d/render-api';
import '../data/polyfills/CanvasContext';

export class WGPUCanvasContext
{
    readonly canvas: HTMLCanvasElement | OffscreenCanvas
    readonly gpuCanvasContext: GPUCanvasContext;
    readonly gpuCanvasConfiguration: GPUCanvasConfiguration;
    readonly invalid: boolean = true;

    private readonly _device: GPUDevice;
    private readonly _context: CanvasContext;

    constructor(device: GPUDevice, context: CanvasContext)
    {
        this._device = device;
        this._context = context;

        WGPUCanvasContext._canvasContextMap.set([device, context], this);

        const r_this = reactive(this);
        const r_context = reactive(context);

        effect(() =>
        {
            r_context.canvasId;

            //
            r_this.canvas = null;
            r_this.gpuCanvasContext = null;
            r_this.invalid = true;
        });

        effect(() =>
        {
            const r_configuration = r_context.configuration;
            if (r_configuration)
            {
                r_configuration.format;
                r_configuration.usage;
                r_configuration.viewFormats?.concat();
                r_configuration.colorSpace;
                r_configuration.toneMapping?.mode;
                r_configuration.alphaMode;
            }

            r_this.gpuCanvasConfiguration = null;
            r_this.invalid = true;
        });
    }

    update()
    {
        if (!this.invalid) return;

        const r_this = reactive(this);

        {
            const canvasId = this._context.canvasId;
            let canvas = this.canvas;
            let gpuCanvasContext = this.gpuCanvasContext;

            if (!canvas)
            {
                canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) as HTMLCanvasElement : canvasId;
                gpuCanvasContext = canvas?.getContext('webgpu') as GPUCanvasContext;

                r_this.canvas = canvas;
                r_this.gpuCanvasContext = gpuCanvasContext;
            }
        }

        {
            let gpuCanvasConfiguration = this.gpuCanvasConfiguration;
            const configuration = this._context.configuration;
            const device = this._device;
            const gpuCanvasContext = this.gpuCanvasContext;

            if (!gpuCanvasConfiguration)
            {
                const format = gpuCanvasConfiguration.format || navigator.gpu.getPreferredCanvasFormat();

                // 附加上 GPUTextureUsage.RENDER_ATTACHMENT
                const usage = (gpuCanvasConfiguration.usage ?? 0)
                    | GPUTextureUsage.COPY_SRC
                    | GPUTextureUsage.COPY_DST
                    | GPUTextureUsage.TEXTURE_BINDING
                    | GPUTextureUsage.STORAGE_BINDING
                    | GPUTextureUsage.RENDER_ATTACHMENT;

                gpuCanvasConfiguration = {
                    ...configuration,
                    device,
                    usage,
                    format,
                };
                gpuCanvasContext.configure(gpuCanvasConfiguration);

                r_this.gpuCanvasConfiguration = gpuCanvasConfiguration;
            }
        }

        r_this.invalid = false;

        return this;
    }

    static getInstance(device: GPUDevice, context: CanvasContext)
    {
        return WGPUCanvasContext._canvasContextMap.get([device, context]) || new WGPUCanvasContext(device, context);
    }

    private static readonly _canvasContextMap = new ChainMap<[device: GPUDevice, context: CanvasContext], WGPUCanvasContext>();
}
