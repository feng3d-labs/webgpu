import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { ChainMap } from "../utils/ChainMap";
import { runRenderObject } from "./runRenderObject";

export function runRenderBundle(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: IGPURenderPassFormat, renderBundleObject: IGPURenderBundleObject)
{
    const gRenderBundle = getGPURenderBundle(device, renderBundleObject, renderPassFormat);

    passEncoder.executeBundles([gRenderBundle]);
}

export function getGPURenderBundle(device: GPUDevice, renderBundleObject: IGPURenderBundleObject, renderPassFormat: IGPURenderPassFormat)
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

    renderBundleObject.renderObjects.forEach((renderObject) =>
    {
        runRenderObject(device, renderBundleEncoder, renderPassFormat, renderObject);
    });

    gpuRenderBundle = renderBundleEncoder.finish();
    map.set([renderBundleObject, renderPassFormat], gpuRenderBundle);

    return gpuRenderBundle;
}

const _RenderBundleMap = "_RenderBundleMap";