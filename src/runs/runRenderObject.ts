import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getIGPURenderPipeline } from "../caches/getIGPURenderPipeline";
import { getIGPUSetBindGroups } from "../caches/getIGPUSetBindGroups";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { runRenderPipeline } from "./runRenderPipeline";

/**
 * 执行渲染对象。
 * 
 * @param device GPU设备。
 * @param passEncoder 渲染通道编码器。
 * @param renderObject 渲染对象。
 * @param renderPass 渲染通道。
 */
export function runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderObject: IGPURenderObject, renderPass: IGPURenderPassDescriptor)
{
    const { pipeline, vertexBuffers, bindingResourceInfoMap } = getIGPURenderPipeline(device, renderObject.pipeline, renderPass, renderObject.vertices);

    runRenderPipeline(device, passEncoder, pipeline);

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(pipeline, renderObject.bindingResources, bindingResourceInfoMap);

    bindGroups?.forEach((bindGroup, index) =>
    {
        const gBindGroup = getGPUBindGroup(device, bindGroup.bindGroup);
        passEncoder.setBindGroup(index, gBindGroup, bindGroup.dynamicOffsets);
    });

    vertexBuffers?.forEach((vertexBuffer, index) =>
    {
        const gBuffer = getGPUBuffer(device, vertexBuffer.buffer);
        passEncoder.setVertexBuffer(index, gBuffer, vertexBuffer.offset, vertexBuffer.size);
    });

    if (renderObject.index)
    {
        const { buffer, indexFormat, offset, size } = renderObject.index;
        const gBuffer = getGPUBuffer(device, buffer);

        passEncoder.setIndexBuffer(gBuffer, indexFormat, offset, size);
    }

    if (renderObject.viewport)
    {
        const { x, y, width, height, minDepth, maxDepth } = renderObject.viewport;
        (passEncoder as GPURenderPassEncoder).setViewport(x, y, width, height, minDepth, maxDepth);
    }

    if (renderObject.scissorRect)
    {
        const { x, y, width, height } = renderObject.scissorRect;
        (passEncoder as GPURenderPassEncoder).setScissorRect(x, y, width, height);
    }

    if (renderObject.draw)
    {
        const { vertexCount, instanceCount, firstVertex, firstInstance } = renderObject.draw;
        passEncoder.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }

    if (renderObject.drawIndexed)
    {
        const { indexCount, instanceCount, firstIndex, baseVertex, firstInstance } = renderObject.drawIndexed;
        passEncoder.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
}