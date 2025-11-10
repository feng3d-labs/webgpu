import { reactive } from '@feng3d/reactivity';
import { BlendState, RenderObject } from '@feng3d/render-api';
import { WGPURenderPassEncoder } from '../../caches/WGPURenderPassEncoder';

export function runBlendConstant(renderObject: RenderObject, passEncoder: WGPURenderPassEncoder)
{
    const r_renderObject = reactive(renderObject);
    const blendConstantColor = BlendState.getBlendConstantColor(r_renderObject.pipeline.fragment?.targets?.[0]?.blend);
    passEncoder.setBlendConstant(blendConstantColor);
}