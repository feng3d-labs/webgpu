import { getIGPURenderPipeline } from "../caches/getIGPURenderPipeline";
import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPURenderObject, IGPURenderPipeline } from "../data/IGPURenderObject";
import { IGPUVertexAttributes } from "../data/IGPUVertexAttributes";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { runBindGroup } from "./runBindGroup";
import { runDraw } from "./runDraw";
import { runDrawIndexed } from "./runDrawIndexed";
import { runIndices } from "./runIndices";
import { runRenderPipeline } from "./runRenderPipeline";
import { runScissorRect } from "./runScissorRect";
import { runVertices } from "./runVertices";
import { runViewport } from "./runViewport";

/**
 * 执行渲染对象。
 * 
 * @param device GPU设备。
 * @param passEncoder 渲染通道编码器。
 * @param renderObject 渲染对象。
 * @param renderPass 渲染通道。
 */
export function runRenderObject(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPassFormat: IGPURenderPassFormat, renderObject: IGPURenderObject)
{
    const { indices, viewport, scissorRect, draw, drawIndexed } = renderObject;

    runRenderBindGroup(device, passEncoder, renderObject.pipeline, renderPassFormat, renderObject.vertices, renderObject.bindingResources);

    runRenderPipeline(device, passEncoder, renderObject.pipeline, renderPassFormat, renderObject.vertices);

    runVertices(device, passEncoder, renderObject.pipeline, renderPassFormat, renderObject.vertices);

    runIndices(device, passEncoder, indices);

    runViewport(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, viewport);

    runScissorRect(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, scissorRect);

    runDraw(passEncoder, draw);

    runDrawIndexed(passEncoder, drawIndexed);
}

export function runRenderBindGroup(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, pipeline0: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices?: IGPUVertexAttributes, bindingResources?: IGPUBindingResources)
{
    const { pipeline, bindingResourceInfoMap } = getIGPURenderPipeline(pipeline0, renderPassFormat, vertices);

    runBindGroup(device, passEncoder, pipeline.layout, bindingResources, bindingResourceInfoMap);
}