import { IGPUCanvasContext } from "../data/IGPUTexture";

export function getGPUCanvasContext(device: GPUDevice, context: IGPUCanvasContext)
{
    let gpuCanvasContext = canvasContextMap.get(context);
    if (gpuCanvasContext) return gpuCanvasContext;

    const canvas = document.getElementById(context.canvasId) as HTMLCanvasElement;

    gpuCanvasContext = canvas.getContext("webgpu");

    //
    context.configuration ||= {};
    context.configuration.alphaMode ||= "premultiplied";
    const format = context.configuration.format ||= navigator.gpu.getPreferredCanvasFormat();

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

    canvasContextMap.set(context, gpuCanvasContext);

    return gpuCanvasContext;
}

const canvasContextMap = new Map<IGPUCanvasContext, GPUCanvasContext>();
