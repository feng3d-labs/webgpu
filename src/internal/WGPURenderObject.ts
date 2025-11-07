import { reactive } from '@feng3d/reactivity';
import { ChainMap, RenderObject } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { runBindGroup } from './renderobject/runBindGroup';
import { runBlendConstant } from './renderobject/runBlendConstant';
import { runIndexBuffer } from './renderobject/runIndexBuffer';
import { runPipeline } from './renderobject/runPipeline';
import { runScissorRect } from './renderobject/runScissorRect';
import { runStencilReference } from './renderobject/runStencilReference';
import { runVertexBuffer } from './renderobject/runVertexBuffer';
import { runViewport } from './renderobject/runViewport';
import { RenderPassFormat } from './RenderPassFormat';
import { CommandType, WGPURenderObjectState } from './WGPURenderObjectState';

export class WGPURenderObject extends ReactiveObject implements RenderPassObjectCommand
{
    constructor(renderObject: RenderObject, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
    {
        super();

        this._onCreate(renderObject, renderPassFormat, attachmentSize);
        //
        WGPURenderObject.map.set([renderObject, renderPassFormat], this);
        this.destroyCall(() => { WGPURenderObject.map.delete([renderObject, renderPassFormat]); });
    }

    private _onCreate(renderObject: RenderObject, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
    {
        const r_renderObject = reactive(renderObject);

        this.run = (device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState) =>
        {
            runViewport(renderObject, state, attachmentSize);

            runScissorRect(renderObject, state, attachmentSize);

            runBlendConstant(renderObject, state);

            runStencilReference(renderObject, state);

            runPipeline(renderObject, state, device, renderPassFormat);

            runBindGroup(renderObject, state, device);

            runVertexBuffer(renderObject, state, device);

            runIndexBuffer(renderObject, state, device);

            state.draw(r_renderObject.draw);
        };
    }

    run: (device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState) => void;

    static getInstance(renderObject: RenderObject, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
    {
        return this.map.get([renderObject, renderPassFormat]) || new WGPURenderObject(renderObject, renderPassFormat, attachmentSize);
    }
    static readonly map = new ChainMap<[RenderObject, RenderPassFormat], WGPURenderObject>();
}

export interface RenderPassObjectCommand
{
    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState): void;
}

export interface PassEncoderCommand
{
    run(commandEncoder: GPUCommandEncoder): void;
}
