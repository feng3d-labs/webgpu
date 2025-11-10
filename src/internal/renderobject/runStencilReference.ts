import { reactive } from '@feng3d/reactivity';
import { RenderObject, getStencilReference } from '@feng3d/render-api';
import { WGPURenderPassCommands } from '../WGPURenderObjectState';

export function runStencilReference(renderObject: RenderObject, state: WGPURenderPassCommands)
{
    const r_renderObject = reactive(renderObject);
    const stencilReference = getStencilReference(r_renderObject.pipeline.depthStencil);
    state.setStencilReference(stencilReference);
}
