import { getGPUBindGroup } from "../caches/getGPUBindGroup";
import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getIGPURenderPipeline } from "../caches/getIGPURenderPipeline";
import { getIGPUSetBindGroups } from "../caches/getIGPUSetBindGroups";
import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { runDraw } from "./runDraw";
import { runDrawIndexed } from "./runDrawIndexed";
import { runIndexBuffer } from "./runIndexBuffer";
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
export function runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderObject: IGPURenderObject, renderPass: IGPURenderPassDescriptor)
{
    const { index, viewport, scissorRect, draw, drawIndexed } = renderObject;

    const { pipeline, vertexBuffers, bindingResourceInfoMap } = getIGPURenderPipeline(device, renderObject.pipeline, renderPass, renderObject.vertices);

    // 计算 bindGroups
    const bindGroups = getIGPUSetBindGroups(pipeline, renderObject.bindingResources, bindingResourceInfoMap);

    runRenderPipeline(device, passEncoder, pipeline);

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

    runIndexBuffer(device, passEncoder, index);

    runViewport(passEncoder as GPURenderPassEncoder, viewport);

    runScissorRect(passEncoder as GPURenderPassEncoder, scissorRect);

    runDraw(passEncoder, draw);

    runDrawIndexed(passEncoder, drawIndexed);
}
