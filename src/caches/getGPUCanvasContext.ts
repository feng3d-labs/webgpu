import { CanvasContext } from "@feng3d/render-api";
import { computed, ComputedRef, reactive } from "@vue/reactivity";
import "../data/polyfills/CanvasContext";

export function getGPUCanvasContext(device: GPUDevice, context: CanvasContext)
{
    let result = canvasContextMap[context.canvasId];
    if (result) return result.value;

    const canvas = document.getElementById(context.canvasId) as HTMLCanvasElement;

    const gpuCanvasContext = canvas.getContext("webgpu");

    const ro = reactive(context);
    result = computed(() =>
    {
        // 监听
        const configuration = ro.configuration;
        if (configuration)
        {
            configuration.format;
            configuration.usage;
            configuration.viewFormats?.forEach(() => { });
            configuration.colorSpace;
            configuration.toneMapping?.mode;
            configuration.alphaMode;
        }

        // 执行
        updateConfigure();

        return gpuCanvasContext;
    });

    canvasContextMap[context.canvasId] = result;

    const updateConfigure = () =>
    {
        //
        const configuration = context.configuration || {};

        const format = configuration.format || navigator.gpu.getPreferredCanvasFormat();

        // 附加上 GPUTextureUsage.RENDER_ATTACHMENT
        const usage = (configuration.usage ?? 0)
            | GPUTextureUsage.COPY_SRC
            | GPUTextureUsage.COPY_DST
            | GPUTextureUsage.TEXTURE_BINDING
            | GPUTextureUsage.STORAGE_BINDING
            | GPUTextureUsage.RENDER_ATTACHMENT;

        //
        gpuCanvasContext.configure({
            ...configuration,
            device,
            usage,
            format,
        });
    };

    return result.value;
}

const canvasContextMap: { [canvasId: string]: ComputedRef<GPUCanvasContext> } = {};
