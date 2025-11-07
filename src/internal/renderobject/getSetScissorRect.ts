import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject } from "@feng3d/render-api";
import { RenderPassFormat } from "../RenderPassFormat";

export function getSetScissorRect(renderPassFormat: RenderPassFormat, renderObject: RenderObject)
{
    const r_renderPassFormat = reactive(renderPassFormat);
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        const attachmentSize = r_renderPassFormat.attachmentSize;

        let setScissorRect: [x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate] | undefined;
        const scissorRect = r_renderObject.scissorRect;
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
                setScissorRect = undefined;
            }
            else
            {
                setScissorRect = [x, y, width, height];
            }
        }
        else
        {
            setScissorRect = undefined;
        }

        return setScissorRect;
    });
}