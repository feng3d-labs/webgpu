import { RenderObject } from '@feng3d/render-api';
import { runBindGroup } from './renderobject/runBindGroup';
import { runBlendConstant } from './renderobject/runBlendConstant';
import { runDraw } from './renderobject/runDraw';
import { runIndexBuffer } from './renderobject/runIndexBuffer';
import { runPipeline } from './renderobject/runPipeline';
import { runScissorRect } from './renderobject/runScissorRect';
import { runStencilReference } from './renderobject/runStencilReference';
import { runVertexBuffer } from './renderobject/runVertexBuffer';
import { runViewport } from './renderobject/runViewport';
import { RenderPassFormat } from './RenderPassFormat';
import { WGPURenderObjectState } from './WGPURenderObjectState';

export function runRenderObject(device: GPUDevice, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number }, renderObject: RenderObject, state: WGPURenderObjectState)
{
    runViewport(renderObject, state, attachmentSize);

    runScissorRect(renderObject, state, attachmentSize);

    runBlendConstant(renderObject, state);

    runStencilReference(renderObject, state);

    runPipeline(renderObject, state, device, renderPassFormat);

    runBindGroup(renderObject, state, device);

    runVertexBuffer(renderObject, state, device);

    runIndexBuffer(renderObject, state, device);

    runDraw(renderObject, state);
}