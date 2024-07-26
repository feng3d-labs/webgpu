import { IGPUCanvasContext } from "../data/IGPUTexture";

export function getGPUCanvasContext(device: GPUDevice, context: IGPUCanvasContext)
{
    let gpuCanvasContext = canvasContextMap.get(context);
    if (gpuCanvasContext) return gpuCanvasContext;

    const canvas = document.getElementById(context.canvasId) as HTMLCanvasElement;

    gpuCanvasContext = canvas.getContext("webgpu");

    let usage = 0;

    if (context.configuration.usage)
    {
        usage = context.configuration.usage;
    }

    // 附加上 GPUTextureUsage.RENDER_ATTACHMENT
    usage = usage | GPUTextureUsage.RENDER_ATTACHMENT;
    //
    const format = context.configuration.format || navigator.gpu.getPreferredCanvasFormat();
    const viewFormats = context.configuration.viewFormats;
    const colorSpace = context.configuration.colorSpace;
    const toneMapping = context.configuration.toneMapping;
    const alphaMode = context.configuration.alphaMode || "premultiplied";

    //
    gpuCanvasContext.configure({
        ...context.configuration,
        device,
        format,
        usage,
        viewFormats,
        colorSpace,
        toneMapping,
        alphaMode,
    });

    canvasContextMap.set(context, gpuCanvasContext);

    return gpuCanvasContext;
}

const canvasContextMap = new Map<IGPUCanvasContext, GPUCanvasContext>();
