import { reactive } from '@feng3d/reactivity';
import { RenderObject, getStencilReference } from '@feng3d/render-api';
import { WGPURenderPassEncoder } from '../../caches/WGPURenderPassEncoder';

export function runStencilReference(renderObject: RenderObject, passEncoder: WGPURenderPassEncoder)
{
    const r_renderObject = reactive(renderObject);
    const stencilReference = getStencilReference(r_renderObject.pipeline.depthStencil);
    passEncoder.setStencilReference(stencilReference);
}
