import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getGPURenderPipeline } from "../caches/getGPURenderPipeline";
import { getIGPURenderObject } from "../caches/getIGPURenderObject";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";

export function runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderObject: IGPURenderObject, renderPass: IGPURenderPassDescriptor)
{
    renderObject = getIGPURenderObject(device, renderObject, renderPass);

    const pipeline = getGPURenderPipeline(device, renderObject.pipeline);
    passEncoder.setPipeline(pipeline);

    if (renderObject.bindGroups)
    {
        renderObject.bindGroups.forEach((bindGroup, index) =>
        {
            const gBindGroup = getGPUBindGroup(device, bindGroup.bindGroup);
            passEncoder.setBindGroup(index, gBindGroup, bindGroup.dynamicOffsets);
        });
    }

    renderObject.vertexBuffers?.forEach((vertexBuffer, index) =>
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