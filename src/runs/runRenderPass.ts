import { getGPURenderPassDescriptor } from "../caches/getGPURenderPassDescriptor";
import { getGPUTextureFormat } from "../caches/getGPUTextureFormat";
import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderOcclusionQueryObject } from "../data/IGPURenderOcclusionQueryObject";
import { IGPURenderPass } from "../data/IGPURenderPass";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { runRenderBundle } from "./runRenderBundle";
import { runRenderObject } from "./runRenderObject";
import { runRenderOcclusionQueryObject } from "./runRenderOcclusionQueryObject";

export function runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass)
{
    const renderPassDescriptor = getGPURenderPassDescriptor(device, renderPass.descriptor);
    const renderPassFormats = getGPURenderPassFormats(renderPass.descriptor);

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    renderPass.renderObjects?.forEach((element) =>
    {
        if ((element as IGPURenderOcclusionQueryObject).type === "OcclusionQueryObject")
        {
            runRenderOcclusionQueryObject(device, passEncoder, renderPassFormats, element as IGPURenderOcclusionQueryObject);
        }
        else if ((element as IGPURenderBundleObject).renderObjects)
        {
            runRenderBundle(device, passEncoder, renderPassFormats, element as IGPURenderBundleObject);
        }
        else
        {
            runRenderObject(device, passEncoder, renderPassFormats, element as IGPURenderObject);
        }
    });

    passEncoder.end();
}

/**
 * 获取渲染通道格式。
 * 
 * @param descriptor 渲染通道描述。
 * @returns 
 */
function getGPURenderPassFormats(descriptor: IGPURenderPassDescriptor): IGPURenderPassFormat
{
    let gpuRenderPassFormats = descriptor[_RenderPassFormats];
    if (gpuRenderPassFormats) return gpuRenderPassFormats;

    const colorAttachmentTextureFormats = descriptor.colorAttachments.map((v) => getGPUTextureFormat(v.view.texture));

    let depthStencilAttachmentTextureFormat: GPUTextureFormat;
    if (descriptor.depthStencilAttachment)
    {
        depthStencilAttachmentTextureFormat = getGPUTextureFormat(descriptor.depthStencilAttachment.view?.texture) || "depth24plus";
    }

    const multisample = descriptor.multisample;
    gpuRenderPassFormats = descriptor[_RenderPassFormats] = {
        attachmentSize: descriptor.attachmentSize,
        colorFormats: colorAttachmentTextureFormats,
        depthStencilFormat: depthStencilAttachmentTextureFormat,
        multisample
    };

    return gpuRenderPassFormats;
}

const _RenderPassFormats = "_RenderPassFormats";