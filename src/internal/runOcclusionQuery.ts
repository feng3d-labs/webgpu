import { OcclusionQuery } from '@feng3d/render-api';
import { runRenderObject } from './runRenderObject';
import { WGPURenderPassCache } from './WGPURenderObjectState';

export function runOcclusionQuery(device: GPUDevice, occlusionQuery: OcclusionQuery, queryIndex: number, state: WGPURenderPassCache)
{
    state.beginOcclusionQuery(queryIndex);

    occlusionQuery.renderObjects.forEach((renderObject) =>
    {
        runRenderObject(device, renderObject, state);
    });

    state.endOcclusionQuery();
}