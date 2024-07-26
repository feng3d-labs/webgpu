import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassEncoder } from "../data/IGPURenderPassEncoder";
import { IRenderBundleObject } from "../data/IRenderBundleObject";
import { IRenderPassEncoder } from "../data/IRenderPassEncoder";
import { getIGPURenderBundle } from "./getIGPURenderBundle";
import { getIGPURenderObject } from "./getIGPURenderObject";
import { getIGPURenderPass } from "./getIGPURenderPass";

export function getIGPURenderPassEncoder(device: GPUDevice, renderPassEncoder: IRenderPassEncoder)
{
    const renderPass = getIGPURenderPass(device, renderPassEncoder.renderPass);

    const renderObjects = renderPassEncoder.renderObjects.map((v) =>
    {
        if (isRenderBundle(v))
        {
            const gpuRenderObject = getIGPURenderBundle(device, v, renderPassEncoder.renderPass);

            return gpuRenderObject;
        }

        const gpuRenderObject = getIGPURenderObject(device, v, renderPassEncoder.renderPass);

        return gpuRenderObject;
    });

    const gpuRenderPassEncoder: IGPURenderPassEncoder = {
        renderPass,
        renderObjects,
    };

    return gpuRenderPassEncoder;
}

function isRenderBundle(arg: IGPURenderObject | IRenderBundleObject): arg is IRenderBundleObject
{
    return !!(arg as IRenderBundleObject).renderObjects;
}
