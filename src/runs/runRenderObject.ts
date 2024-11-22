import { getIGPUPipelineLayout } from "../caches/getIGPUPipelineLayout";
import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPURenderObject, IGPURenderPipeline } from "../data/IGPURenderObject";
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
    const { pipeline, viewport, scissorRect, vertices, indices, bindingResources, draw, drawIndexed } = renderObject;

    runRenderBindGroup(device, passEncoder, pipeline, bindingResources);

    runRenderPipeline(device, passEncoder, pipeline, renderPassFormat, vertices);

    runVertices(device, passEncoder, pipeline, renderPassFormat, vertices);

    runIndices(device, passEncoder, indices);

    runViewport(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, viewport);

    runScissorRect(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, scissorRect);

    runDraw(passEncoder, draw);

    runDrawIndexed(passEncoder, drawIndexed);
}

function runRenderBindGroup(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, pipeline0: IGPURenderPipeline, bindingResources?: IGPUBindingResources)
{
    const { gpuPipelineLayout, bindingResourceInfoMap } = getIGPUPipelineLayout(pipeline0);

    runBindGroup(device, passEncoder, gpuPipelineLayout, bindingResources, bindingResourceInfoMap);
}