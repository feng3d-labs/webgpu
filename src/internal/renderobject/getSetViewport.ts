import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject } from "@feng3d/render-api";
import { WGPURenderObjectState } from "../WGPURenderObjectState";

export function getSetViewport(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        const viewport = r_renderObject.viewport;

        return (state: WGPURenderObjectState, attachmentSize: { readonly width: number, readonly height: number }) =>
        {
            if (viewport)
            {
                const isYup = viewport.isYup ?? true;
                const x = viewport.x ?? 0;
                let y = viewport.y ?? 0;
                const width = viewport.width;
                const height = viewport.height;
                const minDepth = viewport.minDepth ?? 0;
                const maxDepth = viewport.maxDepth ?? 1;

                if (isYup)
                {
                    y = attachmentSize.height - y - height;
                }

                if (x === 0 && y === 0 && width === attachmentSize.width && height === attachmentSize.height && minDepth === 0 && maxDepth === 1)
                {
                    state.setViewport(undefined);
                }
                else
                {
                    state.setViewport([x, y, width, height, minDepth, maxDepth]);
                }
            }
            else
            {
                state.setViewport(undefined);
            }
        };
    });
}