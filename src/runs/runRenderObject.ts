import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getIGPURenderPipeline } from "../caches/getIGPURenderPipeline";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { getIGPUBuffer } from "./getIGPUIndexBuffer";
import { runBindGroup } from "./runComputeBindGroup";
import { runDraw } from "./runDraw";
import { runDrawIndexed } from "./runDrawIndexed";
import { runIndices } from "./runIndices";
import { runRenderPipeline } from "./runRenderPipeline";
import { runScissorRect } from "./runScissorRect";
import { runViewport } from "./runViewport";

/**
 * 执行渲染对象。
 * 
 * @param device GPU设备。
 * @param passEncoder 渲染通道编码器。
 * @param renderObject 渲染对象。
 * @param renderPass 渲染通道。
 */
export function runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormats: IGPURenderPassFormat, renderObject: IGPURenderObject)
{
    const { indices, viewport, scissorRect, draw, drawIndexed } = renderObject;

    const { pipeline, vertexBuffers, bindingResourceInfoMap } = getIGPURenderPipeline(renderObject.pipeline, renderPassFormats, renderObject.vertices);

    runBindGroup(device, passEncoder, pipeline.layout, renderObject.bindingResources, bindingResourceInfoMap);

    runRenderPipeline(device, passEncoder, pipeline);

    vertexBuffers?.forEach((vertexBuffer, index) =>
    {
        const buffer = getIGPUBuffer(vertexBuffer.buffer);
        const gBuffer = getGPUBuffer(device, buffer);
        passEncoder.setVertexBuffer(index, gBuffer, vertexBuffer.offset, vertexBuffer.size);
    });

    runIndices(device, passEncoder, indices);

    runViewport(passEncoder as GPURenderPassEncoder, renderPassFormats.attachmentSize, viewport);

    runScissorRect(passEncoder as GPURenderPassEncoder, renderPassFormats.attachmentSize, scissorRect);

    runDraw(passEncoder, draw);

    runDrawIndexed(passEncoder, drawIndexed);
}
