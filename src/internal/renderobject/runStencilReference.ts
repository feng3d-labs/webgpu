import { reactive } from '@feng3d/reactivity';
import { RenderObject, getStencilReference } from '@feng3d/render-api';
import { WGPURenderObjectState } from '../WGPURenderObjectState';

export function runStencilReference(renderObject: RenderObject, state: WGPURenderObjectState)
{
    const r_renderObject = reactive(renderObject);
    const stencilReference = getStencilReference(r_renderObject.pipeline.depthStencil);
    state.setStencilReference(stencilReference);
}
