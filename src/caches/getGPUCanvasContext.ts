import { CanvasContext } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import "../data/polyfills/CanvasContext";

export function getGPUCanvasContext(device: GPUDevice, context: CanvasContext)
{
    let gpuCanvasContext = canvasContextMap[context.canvasId];
    if (gpuCanvasContext) return gpuCanvasContext;

    const canvas = document.getElementById(context.canvasId) as HTMLCanvasElement;

    gpuCanvasContext = canvas.getContext("webgpu");

    canvasContextMap[context.canvasId] = gpuCanvasContext;

    const updateConfigure = () =>
    {
        //
        context.configuration = context.configuration || {};
        const format = (context.configuration as any).format = context.configuration.format || navigator.gpu.getPreferredCanvasFormat();

        let usage = 0;

        if (context.configuration.usage)
        {
            usage = context.configuration.usage;
        }

        // 附加上 GPUTextureUsage.RENDER_ATTACHMENT
        usage = usage | GPUTextureUsage.RENDER_ATTACHMENT;

        //
        gpuCanvasContext.configure({
            ...context.configuration,
            device,
            usage,
            format,
        });
    };

    updateConfigure();

    watcher.watchobject(context, { configuration: { usage: undefined, format: undefined, colorSpace: undefined, toneMapping: { mode: undefined }, alphaMode: undefined } }, updateConfigure);

    return gpuCanvasContext;
}

const canvasContextMap: { [canvasId: string]: GPUCanvasContext } = {};
