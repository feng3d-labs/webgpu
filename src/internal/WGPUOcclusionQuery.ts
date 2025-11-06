import { ChainMap, OcclusionQuery } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { RenderPassFormat } from './RenderPassFormat';
import { CommandType, WGPURenderObject, WGPURenderObjectState } from './WGPURenderObject';

export class WGPUOcclusionQuery extends ReactiveObject
{
    run: (device: GPUDevice, commands: CommandType[], queryIndex: number, state: WGPURenderObjectState) => void;

    constructor(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery)
    {
        super();

        this._onCreate(device, renderPassFormat, occlusionQuery);
        //
        WGPUOcclusionQuery.map.set([device, renderPassFormat, occlusionQuery], this);
        this.destroyCall(() => { WGPUOcclusionQuery.map.delete([device, renderPassFormat, occlusionQuery]); });
    }

    private _onCreate(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery)
    {
        this.run = (device: GPUDevice, commands: CommandType[], queryIndex: number, state: WGPURenderObjectState) =>
        {
            commands.push(['beginOcclusionQuery', queryIndex]);

            occlusionQuery.renderObjects.forEach((renderObject) =>
            {
                const wgpuRenderObject = WGPURenderObject.getInstance(device, renderObject, renderPassFormat);
                wgpuRenderObject.run(undefined, commands, state);
            });

            commands.push(['endOcclusionQuery']);
        };
    }

    static getInstance(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery)
    {
        return this.map.get([device, renderPassFormat, occlusionQuery]) || new WGPUOcclusionQuery(device, renderPassFormat, occlusionQuery);
    }
    static readonly map = new ChainMap<[GPUDevice, RenderPassFormat, OcclusionQuery], WGPUOcclusionQuery>();
}
