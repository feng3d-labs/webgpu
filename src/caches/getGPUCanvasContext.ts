import { CanvasContext } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import "../data/polyfills/CanvasContext";
import { computed, ComputedRef, reactive } from "@vue/reactivity";

export function getGPUCanvasContext(device: GPUDevice, context: CanvasContext)
{
    let result = canvasContextMap[context.canvasId];
    if (result) return result;

    const canvas = document.getElementById(context.canvasId) as HTMLCanvasElement;

    const gpuCanvasContext = canvas.getContext("webgpu");

    result = computed(() =>
    {
        // 监听
        const ro = reactive(context);
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

    return result;
}

const canvasContextMap: { [canvasId: string]: ComputedRef<GPUCanvasContext> } = {};
