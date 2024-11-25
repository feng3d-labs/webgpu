import { IGPURenderObject } from "../data/IGPURenderObject";
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
    const { viewport, scissorRect, pipeline, vertices, indices, bindingResources, draw, drawIndexed } = renderObject;

    runViewport(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, viewport);

    runScissorRect(passEncoder as GPURenderPassEncoder, renderPassFormat.attachmentSize, scissorRect);

    runRenderPipeline(device, passEncoder, pipeline, renderPassFormat, vertices);

    runBindGroup(device, passEncoder, pipeline, bindingResources);

    runVertices(device, passEncoder, pipeline, renderPassFormat, vertices);

    runIndices(device, passEncoder, indices);

    runDraw(passEncoder, draw);

    runDrawIndexed(passEncoder, drawIndexed);
}
