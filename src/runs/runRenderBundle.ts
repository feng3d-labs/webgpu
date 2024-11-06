import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { GPURenderPassFormat } from "../internal/GPURenderPassFormats";
import { runRenderObject } from "./runRenderObject";

export function runRenderBundle(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormat: GPURenderPassFormat, renderBundleObject: IGPURenderBundleObject)
{
    let gRenderBundle: GPURenderBundle = renderBundleObject[_GPURenderBundle];
    if (!gRenderBundle)
    {
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
            runRenderObject(device, renderBundleEncoder, renderObject, renderPassFormat);
        });

        gRenderBundle = renderBundleEncoder.finish();

        renderBundleObject[_GPURenderBundle] = gRenderBundle;
    }

    passEncoder.executeBundles([gRenderBundle]);
}

const _GPURenderBundle = "_GPURenderBundle";
