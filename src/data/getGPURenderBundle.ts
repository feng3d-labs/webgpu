import { IGPURenderBundleObject } from "./IGPURenderBundleObject";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import type { RunWebGPU } from "../runs/RunWebGPU";
import { ChainMap } from "../utils/ChainMap";

export function getGPURenderBundle(runWebGPU: RunWebGPU, device: GPUDevice, renderBundleObject: IGPURenderBundleObject, renderPassFormat: IGPURenderPassFormat)
{
    const map: ChainMap<[IGPURenderBundleObject, IGPURenderPassFormat], GPURenderBundle> = device[_RenderBundleMap] = device[_RenderBundleMap] || new ChainMap();
    //
    let gpuRenderBundle: GPURenderBundle = map.get([renderBundleObject, renderPassFormat]);
    if (gpuRenderBundle) return gpuRenderBundle;

    //
    const descriptor: GPURenderBundleEncoderDescriptor = {
        ...renderBundleObject.descriptor,
        colorFormats: renderPassFormat.colorFormats,
        depthStencilFormat: renderPassFormat.depthStencilFormat,
        sampleCount: renderPassFormat.multisample,
    };

    //
    const renderBundleEncoder = device.createRenderBundleEncoder(descriptor);

    runWebGPU["runRenderBundleObjects"](device, renderBundleEncoder, renderPassFormat, renderBundleObject.renderObjects);

    gpuRenderBundle = renderBundleEncoder.finish();
    map.set([renderBundleObject, renderPassFormat], gpuRenderBundle);

    return gpuRenderBundle;
}

const _RenderBundleMap = "_RenderBundleMap";