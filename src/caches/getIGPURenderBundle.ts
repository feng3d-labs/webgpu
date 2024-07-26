import { IGPURenderBundleEncoderDescriptor, IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassEncoder";
import { IRenderBundleObject } from "../data/IRenderBundleObject";
import { getIGPURenderObject } from "./getIGPURenderObject";
import { getIRenderPassFormats } from "./getIGPURenderPass";

export function getIGPURenderBundle(device: GPUDevice, renderBundleObject: IRenderBundleObject, renderPass: IGPURenderPassDescriptor)
{
    let gpuRenderBundleObject: IGPURenderBundleObject = gpuRenderBundleObjectMap.get(renderBundleObject);
    if (gpuRenderBundleObject)
    {
        return gpuRenderBundleObject;
    }

    // 获取渲染通道附件纹理格式。
    const { colorAttachmentTextureFormats, depthStencilAttachmentTextureFormat } = getIRenderPassFormats(device, renderPass);

    const renderBundle: IGPURenderBundleEncoderDescriptor = {
        ...renderBundleObject.renderBundle,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        sampleCount: renderPass.multisample,
    };

    const renderObjects = renderBundleObject.renderObjects.map((v) => getIGPURenderObject(device, v, renderPass));

    gpuRenderBundleObject = {
        renderBundle,
        renderObjects,
    };

    gpuRenderBundleObjectMap.set(renderBundleObject, gpuRenderBundleObject);

    return gpuRenderBundleObject;
}
const gpuRenderBundleObjectMap = new WeakMap<IRenderBundleObject, IGPURenderBundleObject>();
