import { reactive } from '@feng3d/reactivity';
import { BlendState, RenderObject } from '@feng3d/render-api';
import { WGPURenderObjectState } from '../WGPURenderObjectState';

export function runBlendConstant(renderObject: RenderObject, state: WGPURenderObjectState)
{
    const r_renderObject = reactive(renderObject);
    const blendConstantColor = BlendState.getBlendConstantColor(r_renderObject.pipeline.fragment?.targets?.[0]?.blend);
    state.setBlendConstant(blendConstantColor);
}