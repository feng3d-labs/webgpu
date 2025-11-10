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
import { WGPURenderPassCache } from './WGPURenderObjectState';

export function runRenderObject(device: GPUDevice, renderObject: RenderObject, state: WGPURenderPassCache)
{
    runViewport(renderObject, state);

    runScissorRect(renderObject, state);

    runBlendConstant(renderObject, state);

    runStencilReference(renderObject, state);

    runPipeline(renderObject, state, device);

    runBindGroup(renderObject, state, device);

    runVertexBuffer(renderObject, state, device);

    runIndexBuffer(renderObject, state, device);

    runDraw(renderObject, state);
}