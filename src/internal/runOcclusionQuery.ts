import { OcclusionQuery } from '@feng3d/render-api';
import { RenderPassFormat } from './RenderPassFormat';
import { runRenderObject } from './runRenderObject';
import { CommandType, WGPURenderObjectState } from './WGPURenderObjectState';

export function runOcclusionQuery(device: GPUDevice, queryIndex: number, state: WGPURenderObjectState, occlusionQuery: OcclusionQuery, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
{
    state.beginOcclusionQuery(queryIndex);

    occlusionQuery.renderObjects.forEach((renderObject) =>
    {
        runRenderObject(device, renderPassFormat, attachmentSize, renderObject, state);
    });

    state.endOcclusionQuery();
}