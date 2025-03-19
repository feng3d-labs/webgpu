import { CanvasContext, ChainMap } from "@feng3d/render-api";
import { computed, ComputedRef, reactive } from "@vue/reactivity";
import "../data/polyfills/CanvasContext";

export function getGPUCanvasContext(device: GPUDevice, context: CanvasContext)
{
    const getGPUCanvasContextKey: GetGPUCanvasContextKey = [device, context];
    let result = getGPUCanvasContextMap.get(getGPUCanvasContextKey);
    if (result) return result.value;

    const canvas = typeof context.canvasId === "string" ? document.getElementById(context.canvasId) as HTMLCanvasElement : context.canvasId;

    const gpuCanvasContext = canvas.getContext("webgpu") as GPUCanvasContext;
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

    getGPUCanvasContextMap.set(getGPUCanvasContextKey, result);

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
type GetGPUCanvasContextKey = [device: GPUDevice, context: CanvasContext];
const getGPUCanvasContextMap = new ChainMap<GetGPUCanvasContextKey, ComputedRef<GPUCanvasContext>>;