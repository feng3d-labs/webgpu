import { computed, reactive } from "@feng3d/reactivity";
import { BlendState, RenderObject } from "@feng3d/render-api";
import { WGPURenderObjectState } from "../WGPURenderObjectState";

export function getSetBlendConstant(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        //
        return (state: WGPURenderObjectState) =>
        {
            const blendConstantColor = BlendState.getBlendConstantColor(r_renderObject.pipeline.fragment?.targets?.[0]?.blend);
            state.setBlendConstant(blendConstantColor);
        };
    });
}