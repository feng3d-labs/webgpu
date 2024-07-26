import { IGPURenderPassEncoder } from "../data/IGPURenderPassEncoder";
import { IRenderBundleObject } from "../data/IRenderBundleObject";
import { IRenderObject } from "../data/IRenderObject";
import { IRenderPassEncoder } from "../data/IRenderPassEncoder";
import { getIGPURenderBundle } from "./getIGPURenderBundle";
import { getIGPURenderObject } from "./getIGPURenderObject";
import { getIGPURenderPass } from "./getIGPURenderPass";

export function getIGPURenderPassEncoder(renderPassEncoder: IRenderPassEncoder)
{
    const renderPass = getIGPURenderPass(renderPassEncoder.renderPass);

    const renderObjects = renderPassEncoder.renderObjects.map((v) =>
    {
        if (isRenderBundle(v))
        {
            const gpuRenderObject = getIGPURenderBundle(v, renderPassEncoder.renderPass);

            return gpuRenderObject;
        }

        const gpuRenderObject = getIGPURenderObject(v, renderPassEncoder.renderPass);

        return gpuRenderObject;
    });

    const gpuRenderPassEncoder: IGPURenderPassEncoder = {
        renderPass,
        renderObjects,
    };

    return gpuRenderPassEncoder;
}

function isRenderBundle(arg: IRenderObject | IRenderBundleObject): arg is IRenderBundleObject
{
    return !!(arg as IRenderBundleObject).renderObjects;
}
