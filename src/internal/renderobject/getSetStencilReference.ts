import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject, getStencilReference } from "@feng3d/render-api";

export function getSetStencilReference(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        let setStencilReference: [func: 'setStencilReference', reference: GPUStencilValue];
        //
        const stencilReference = getStencilReference(r_renderObject.pipeline.depthStencil);
        if (stencilReference === undefined)
        {
            setStencilReference = null;
        }
        else
        {
            setStencilReference = ['setStencilReference', stencilReference];
        }

        return setStencilReference;
    });
}
