import { getGPURenderBundleEncoderDescriptor } from "../caches/getIGPURenderBundleEncoderDescriptor";
import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { runRenderObject } from "./runRenderObject";

export function runRenderBundle(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPass: IGPURenderPassDescriptor, renderBundleObject: IGPURenderBundleObject)
{
    let gRenderBundle: GPURenderBundle = renderBundleObject[_GPURenderBundle];
    if (!gRenderBundle)
    {
        //
        const renderBundle = getGPURenderBundleEncoderDescriptor(renderBundleObject.descriptor, renderPass);

        const renderBundleEncoder = device.createRenderBundleEncoder(renderBundle);
        renderBundleObject.renderObjects.forEach((renderObject) =>
        {
            runRenderObject(device, renderBundleEncoder, renderObject, renderPass);
        });

        gRenderBundle = renderBundleEncoder.finish();
        renderBundleObject[_GPURenderBundle] = gRenderBundle;
    }

    passEncoder.executeBundles([gRenderBundle]);
}

const _GPURenderBundle = "_GPURenderBundle";