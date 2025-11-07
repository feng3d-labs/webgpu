import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject } from "@feng3d/render-api";
import { RenderPassFormat } from "../RenderPassFormat";

export function getSetViewport(renderPassFormat: RenderPassFormat, renderObject: RenderObject)
{
    const r_renderPassFormat = reactive(renderPassFormat);
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        const attachmentSize = r_renderPassFormat.attachmentSize;
        const viewport = r_renderObject.viewport;

        let setViewport: [func: 'setViewport', x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number];

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
            //
            setViewport = ['setViewport', x, y, width, height, minDepth, maxDepth];
        }
        else
        {
            //
            setViewport = ['setViewport', 0, 0, attachmentSize.width, attachmentSize.height, 0, 1];
        }

        return setViewport;
    });
}