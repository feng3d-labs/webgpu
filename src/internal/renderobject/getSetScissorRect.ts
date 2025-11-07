import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject } from "@feng3d/render-api";
import { WGPURenderObjectState } from "../WGPURenderObjectState";

export function getSetScissorRect(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        const scissorRect = r_renderObject.scissorRect;

        return (state: WGPURenderObjectState, attachmentSize: { readonly width: number, readonly height: number }) =>
        {
            if (scissorRect)
            {
                const isYup = scissorRect.isYup ?? true;
                const x = scissorRect.x ?? 0;
                let y = scissorRect.y ?? 0;
                const width = scissorRect.width;
                const height = scissorRect.height;

                if (isYup)
                {
                    y = attachmentSize.height - y - height;
                }

                if (x === 0 && y === 0 && width === attachmentSize.width && height === attachmentSize.height)
                {
                    state.setScissorRect(undefined);
                }
                else
                {
                    state.setScissorRect([x, y, width, height]);
                }
            }
            else
            {
                state.setScissorRect(undefined);
            }
        };
    });
}