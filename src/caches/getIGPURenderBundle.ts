import { IRenderBundleObject } from '../data/IRenderBundleObject';
import { IRenderPass } from '../data/IRenderPass';
import { IGPURenderBundleObject, IGPURenderBundleEncoderDescriptor } from '../webgpu-data-driven/data/IGPURenderBundleObject';
import { getIGPURenderObject } from './getIGPURenderObject';
import { getIRenderPassFormats } from './getIGPURenderPass';

export function getIGPURenderBundle(renderBundleObject: IRenderBundleObject, renderPass: IRenderPass)
{
    let gpuRenderBundleObject: IGPURenderBundleObject = gpuRenderBundleObjectMap.get(renderBundleObject);
    if (gpuRenderBundleObject)
    {
        return gpuRenderBundleObject;
    }

    // 获取渲染通道附件纹理格式。
    const { colorAttachmentTextureFormats, depthStencilAttachmentTextureFormat } = getIRenderPassFormats(renderPass);

    const renderBundle: IGPURenderBundleEncoderDescriptor = {
        ...renderBundleObject.renderBundle,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        sampleCount: renderPass.multisample,
    };

    const renderObjects = renderBundleObject.renderObjects.map((v) => getIGPURenderObject(v, renderPass));

    gpuRenderBundleObject = {
        renderBundle,
        renderObjects,
    };

    gpuRenderBundleObjectMap.set(renderBundleObject, gpuRenderBundleObject);

    return gpuRenderBundleObject;
}
const gpuRenderBundleObjectMap = new WeakMap<IRenderBundleObject, IGPURenderBundleObject>();
