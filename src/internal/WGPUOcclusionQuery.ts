import { ChainMap, OcclusionQuery } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { RenderPassFormat } from './RenderPassFormat';
import { runRenderObject } from './runRenderObject';
import { CommandType, WGPURenderObjectState } from './WGPURenderObjectState';

export class WGPUOcclusionQuery extends ReactiveObject
{
    run: (device: GPUDevice, commands: CommandType[], queryIndex: number, state: WGPURenderObjectState) => void;

    constructor(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery, attachmentSize: { readonly width: number, readonly height: number })
    {
        super();

        this._onCreate(device, renderPassFormat, occlusionQuery, attachmentSize);
        //
        WGPUOcclusionQuery.map.set([device, renderPassFormat, occlusionQuery], this);
        this.destroyCall(() => { WGPUOcclusionQuery.map.delete([device, renderPassFormat, occlusionQuery]); });
    }

    private _onCreate(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery, attachmentSize: { readonly width: number, readonly height: number })
    {
        this.run = (device: GPUDevice, commands: CommandType[], queryIndex: number, state: WGPURenderObjectState) =>
        {
            commands.push(['beginOcclusionQuery', [queryIndex]]);

            occlusionQuery.renderObjects.forEach((renderObject) =>
            {
                runRenderObject(device, renderPassFormat, attachmentSize, renderObject, state);
            });

            commands.push(['endOcclusionQuery']);
        };
    }

    static getInstance(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery, attachmentSize: { readonly width: number, readonly height: number })
    {
        return this.map.get([device, renderPassFormat, occlusionQuery]) || new WGPUOcclusionQuery(device, renderPassFormat, occlusionQuery, attachmentSize);
    }
    static readonly map = new ChainMap<[GPUDevice, RenderPassFormat, OcclusionQuery], WGPUOcclusionQuery>();
}
