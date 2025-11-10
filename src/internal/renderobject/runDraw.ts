import { reactive } from '@feng3d/reactivity';
import { RenderObject } from '@feng3d/render-api';
import { WGPURenderPassCommands } from '../WGPURenderObjectState';

export function runDraw(renderObject: RenderObject, state: WGPURenderPassCommands)
{
    const r_renderObject = reactive(renderObject);
    const draw = r_renderObject.draw;

    //
    if (draw.__type__ === 'DrawVertex')
    {
        state.draw(draw.vertexCount, draw.instanceCount, draw.firstVertex, draw.firstInstance);
    }
    else
    {
        state.drawIndexed(draw.indexCount, draw.instanceCount, draw.firstIndex, draw.baseVertex, draw.firstInstance);
    }
}
