import { reactive } from '@feng3d/reactivity';
import { ChainMap, OcclusionQuery } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { RenderPassFormat } from './RenderPassFormat';
import { CommandType, RenderPassObjectCommand, WGPURenderObject } from './WGPURenderObject';

export class WGPUOcclusionQuery extends ReactiveObject implements RenderPassObjectCommand
{
    queryIndex: number;
    wgpuRenderObjects: WGPURenderObject[];

    constructor(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery)
    {
        super();

        this._onCreate(device, renderPassFormat, occlusionQuery);
        this._onMap(device, renderPassFormat, occlusionQuery);
    }

    private _onCreate(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery)
    {
        const r_renderOcclusionQueryObject = reactive(occlusionQuery);
        this.effect(() =>
        {
            r_renderOcclusionQueryObject.renderObjects.concat();

            const renderObjects = occlusionQuery.renderObjects;

            this.wgpuRenderObjects = renderObjects.map((element) =>
                WGPURenderObject.getInstance(device, element, renderPassFormat));
        });
    }

    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObject)
    {
        commands.push(['beginOcclusionQuery', this.queryIndex]);
        for (let i = 0, len = this.wgpuRenderObjects.length; i < len; i++)
        {
            this.wgpuRenderObjects[i].run(undefined, commands, state);
        }
        commands.push(['endOcclusionQuery']);
    }

    private _onMap(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery)
    {
        device.occlusionQueryCaches ??= new ChainMap();
        device.occlusionQueryCaches.set([renderPassFormat, occlusionQuery], this);
        this.destroyCall(() => { device.occlusionQueryCaches.delete([renderPassFormat, occlusionQuery]); });
    }

    static getInstance(device: GPUDevice, renderPassFormat: RenderPassFormat, occlusionQuery: OcclusionQuery)
    {
        return device.occlusionQueryCaches?.get([renderPassFormat, occlusionQuery]) || new WGPUOcclusionQuery(device, renderPassFormat, occlusionQuery);
    }
}

declare global
{
    interface GPUDevice
    {
        occlusionQueryCaches: ChainMap<[renderPassFormat: RenderPassFormat, renderOcclusionQueryObject: OcclusionQuery], WGPUOcclusionQuery>;
    }
}