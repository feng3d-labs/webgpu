import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject, getStencilReference } from "@feng3d/render-api";
import { WGPURenderObjectState } from "../WGPURenderObjectState";

export function getSetStencilReference(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        //
        return (state: WGPURenderObjectState) =>
        {
            const stencilReference = getStencilReference(r_renderObject.pipeline.depthStencil);
            state.setStencilReference(stencilReference);
        };
    });
}
