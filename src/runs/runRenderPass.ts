import { anyEmitter } from "@feng3d/event";
import { getGPURenderPassDescriptor } from "../caches/getGPURenderPassDescriptor";
import { getGPUTextureFormat } from "../caches/getGPUTextureFormat";
import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderOcclusionQueryObject } from "../data/IGPURenderOcclusionQueryObject";
import { IGPURenderPass } from "../data/IGPURenderPass";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { GPUQueue_submit } from "../eventnames";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { runRenderBundle } from "./runRenderBundle";
import { runRenderObject } from "./runRenderObject";
import { runRenderOcclusionQueryObject } from "./runRenderOcclusionQueryObject";

export function runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass)
{
    const renderPassDescriptor = getGPURenderPassDescriptor(device, renderPass.descriptor);
    const renderPassFormats = getGPURenderPassFormats(renderPass.descriptor);

    // 处理不被遮挡查询。
    const occlusionQueryCount = renderPass.renderObjects.reduce((pv, cv) => { if ((cv as IGPURenderOcclusionQueryObject).type === "OcclusionQueryObject") pv++; return pv; }, 0);
    if (occlusionQueryCount > 0)
    {
        renderPassDescriptor.occlusionQuerySet = device.createQuerySet({ type: 'occlusion', count: occlusionQueryCount });
    }

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    //
    const occlusionQueryObjects: IGPURenderOcclusionQueryObject[] = [];
    renderPass.renderObjects?.forEach((element) =>
    {
        if ((element as IGPURenderOcclusionQueryObject).type === "OcclusionQueryObject")
        {
            const renderOcclusionQueryObject = element as IGPURenderOcclusionQueryObject;
            renderOcclusionQueryObject.result = undefined;
            runRenderOcclusionQueryObject(device, passEncoder, renderPassFormats, occlusionQueryObjects.length, renderOcclusionQueryObject);
            occlusionQueryObjects.push(renderOcclusionQueryObject);
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

    // 处理不被遮挡查询。
    if (occlusionQueryCount > 0)
    {
        const resolveBuf: GPUBuffer = renderPass["resolveBuffer"] = renderPass["resolveBuffer"] || device.createBuffer({
            label: 'resolveBuffer',
            // Query results are 64bit unsigned integers.
            size: occlusionQueryCount * BigUint64Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });

        commandEncoder.resolveQuerySet(renderPassDescriptor.occlusionQuerySet, 0, occlusionQueryCount, resolveBuf, 0);

        const resultBuf = renderPass["resultBuffer"] = renderPass["resultBuffer"] || device.createBuffer({
            label: 'resultBuffer',
            size: resolveBuf.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        if (resultBuf.mapState === 'unmapped')
        {
            commandEncoder.copyBufferToBuffer(resolveBuf, 0, resultBuf, 0, resultBuf.size);
        }

        const getOcclusionQueryResult = () =>
        {
            if (resultBuf.mapState === 'unmapped')
            {
                resultBuf.mapAsync(GPUMapMode.READ).then(() =>
                {
                    const results = new BigUint64Array(resultBuf.getMappedRange());

                    occlusionQueryObjects.forEach((v, i) =>
                    {
                        v.result = results[i] as any;
                    });

                    resultBuf.unmap();

                    renderPass._occlusionQueryResults = occlusionQueryObjects;

                    //
                    anyEmitter.off(device.queue, GPUQueue_submit, getOcclusionQueryResult);
                });
            }
        };

        // 监听提交WebGPU事件
        anyEmitter.on(device.queue, GPUQueue_submit, getOcclusionQueryResult);
    }
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