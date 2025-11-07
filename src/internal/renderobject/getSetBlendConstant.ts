import { computed, reactive } from "@feng3d/reactivity";
import { BlendState, RenderObject } from "@feng3d/render-api";

export function getSetBlendConstant(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        let setBlendConstant: [func: 'setBlendConstant', color: GPUColor];
        //
        const blendConstantColor = BlendState.getBlendConstantColor(r_renderObject.pipeline.fragment?.targets?.[0]?.blend);
        if (blendConstantColor === undefined)
        {
            setBlendConstant = null;
        }
        else
        {
            setBlendConstant = ['setBlendConstant', blendConstantColor];
        }

        return setBlendConstant;
    });
}