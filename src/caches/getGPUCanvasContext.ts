import { CanvasContext, ChainMap } from "@feng3d/render-api";
import { computed, Computed, reactive } from "@feng3d/reactivity";
import "../data/polyfills/CanvasContext";

export function getGPUCanvasContext(device: GPUDevice, context: CanvasContext)
{
    const getGPUCanvasContextKey: GetGPUCanvasContextKey = [device, context];
    let result = getGPUCanvasContextMap.get(getGPUCanvasContextKey);
    if (result) return result.value;

    result = computed(() =>
    {
        // 监听
        const ro = reactive(context);
        ro.canvasId;

        const canvas = typeof context.canvasId === "string" ? document.getElementById(context.canvasId) as HTMLCanvasElement : context.canvasId;

        const gpuCanvasContext = canvas.getContext("webgpu") as GPUCanvasContext;

        // 监听
        const r_configuration = ro.configuration;
        if (r_configuration)
        {
            r_configuration.format;
            r_configuration.usage;
            r_configuration.viewFormats?.forEach(() => { });
            r_configuration.colorSpace;
            r_configuration.toneMapping?.mode;
            r_configuration.alphaMode;
        }

        // 执行
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

        return gpuCanvasContext;
    });

    getGPUCanvasContextMap.set(getGPUCanvasContextKey, result);

    return result.value;
}
type GetGPUCanvasContextKey = [device: GPUDevice, context: CanvasContext];
const getGPUCanvasContextMap = new ChainMap<GetGPUCanvasContextKey, Computed<GPUCanvasContext>>();