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

        let setScissorRect: [func: 'setScissorRect', x: GPUIntegerCoordinate, y: GPUIntegerCoordinate, width: GPUIntegerCoordinate, height: GPUIntegerCoordinate];
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

            setScissorRect = ['setScissorRect', x, y, width, height];
        }
        else
        {
            setScissorRect = ['setScissorRect', 0, 0, attachmentSize.width, attachmentSize.height];
        }

        return setScissorRect;
    });
}