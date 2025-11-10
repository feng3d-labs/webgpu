import { reactive } from '@feng3d/reactivity';
import { RenderObject } from '@feng3d/render-api';
import { WGPURenderPassCommands } from '../WGPURenderObjectState';

export function runScissorRect(renderObject: RenderObject, state: WGPURenderPassCommands)
{
    const r_renderObject = reactive(renderObject);
    const scissorRect = r_renderObject.scissorRect;

    const attachmentSize = state.attachmentSize;
    
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