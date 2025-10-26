import { OcclusionQuery } from '@feng3d/render-api';
import { WebGPU } from '../WebGPU';
import { CommandType, WGPURenderObject, RenderPassObjectCommand } from './WGPURenderObject';
import { RenderPassFormat } from './RenderPassFormat';

export class OcclusionQueryCache implements RenderPassObjectCommand
{
    static getInstance(webgpu: WebGPU, renderPassFormat: RenderPassFormat, renderOcclusionQueryObject: OcclusionQuery)
    {
        const occlusionQueryCache = new OcclusionQueryCache(webgpu, renderPassFormat, renderOcclusionQueryObject);

        return occlusionQueryCache;
    }

    constructor(webgpu: WebGPU, renderPassFormat: RenderPassFormat, renderOcclusionQueryObject: OcclusionQuery)
    {
        this.renderObjectCaches = webgpu.runRenderObjects(renderPassFormat, renderOcclusionQueryObject.renderObjects);
    }

    queryIndex: number;
    renderObjectCaches: WGPURenderObject[];

    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObject)
    {
        commands.push(['beginOcclusionQuery', this.queryIndex]);
        for (let i = 0, len = this.renderObjectCaches.length; i < len; i++)
        {
            this.renderObjectCaches[i].run(undefined, commands, state);
        }
        commands.push(['endOcclusionQuery']);
    }
}
