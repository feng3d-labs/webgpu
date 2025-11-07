import { computed, reactive } from "@feng3d/reactivity";
import { BlendState, RenderObject } from "@feng3d/render-api";

export function getSetBlendConstant(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        //
        const blendConstantColor = BlendState.getBlendConstantColor(r_renderObject.pipeline.fragment?.targets?.[0]?.blend);

        return blendConstantColor;
    });
}