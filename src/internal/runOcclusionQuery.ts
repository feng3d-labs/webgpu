import { OcclusionQuery } from '@feng3d/render-api';
import { RenderPassFormat } from './RenderPassFormat';
import { runRenderObject } from './runRenderObject';
import { CommandType, WGPURenderObjectState } from './WGPURenderObjectState';

export function runOcclusionQuery(device: GPUDevice, commands: CommandType[], queryIndex: number, state: WGPURenderObjectState, occlusionQuery: OcclusionQuery, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
{
    commands.push(['beginOcclusionQuery', [queryIndex]]);

    occlusionQuery.renderObjects.forEach((renderObject) =>
    {
        runRenderObject(device, renderPassFormat, attachmentSize, renderObject, state);
    });

    commands.push(['endOcclusionQuery']);
}