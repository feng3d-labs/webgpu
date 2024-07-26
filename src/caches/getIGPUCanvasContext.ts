import { ICanvasContext } from "../data/ICanvasContext";
import { IGPUCanvasConfiguration } from "../data/IGPUCanvasConfiguration";
import { IGPUCanvasContext } from "../data/IGPUTexture";

let defaultConfiguration: IGPUCanvasConfiguration;

export function getIGPUCanvasContext(canvasContext: ICanvasContext)
{
    let gpuCanvasContext = canvasContextMap.get(canvasContext);
    if (!gpuCanvasContext)
    {
        defaultConfiguration ||= {
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied"
        };

        gpuCanvasContext = {
            canvasId: canvasContext.canvasId,
            configuration: {
                ...defaultConfiguration,
                ...canvasContext.configuration,
            }
        };
        canvasContextMap.set(canvasContext, gpuCanvasContext);
    }

    return gpuCanvasContext;
}

const canvasContextMap = new WeakMap<ICanvasContext, IGPUCanvasContext>();

export function isICanvasContext(arg: any): arg is ICanvasContext
{
    return !!(arg as ICanvasContext).canvasId;
}
