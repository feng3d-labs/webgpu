import { reactive } from '@feng3d/reactivity';
import { RenderObject } from '@feng3d/render-api';
import { WGPURenderPassCache } from '../WGPURenderObjectState';

export function runScissorRect(renderObject: RenderObject, state: WGPURenderPassCache, attachmentSize: { readonly width: number, readonly height: number })
{
    const r_renderObject = reactive(renderObject);
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

        state.setScissorRect(x, y, width, height);
    }
    else
    {
        state.setScissorRect(0, 0, attachmentSize.width, attachmentSize.height);
    }
}