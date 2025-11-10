import { OcclusionQuery } from '@feng3d/render-api';
import { runRenderObject } from './runRenderObject';
import { WGPURenderPassEncoder } from '../caches/WGPURenderPassEncoder';

export function runOcclusionQuery(device: GPUDevice, occlusionQuery: OcclusionQuery, queryIndex: number, state: WGPURenderPassEncoder)
{
    state.beginOcclusionQuery(queryIndex);

    occlusionQuery.renderObjects.forEach((renderObject) =>
    {
        runRenderObject(device, renderObject, state);
    });

    state.endOcclusionQuery();
}