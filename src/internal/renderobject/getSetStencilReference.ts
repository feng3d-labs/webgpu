import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject, getStencilReference } from "@feng3d/render-api";

export function getSetStencilReference(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        //
        const stencilReference = getStencilReference(r_renderObject.pipeline.depthStencil);

        return stencilReference;
    });
}
