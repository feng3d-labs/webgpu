import { computed, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderObject } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { getSetBindGroup } from './renderobject/getSetBindGroup';
import { getSetBlendConstant } from './renderobject/getSetBlendConstant';
import { getSetIndexBuffer } from './renderobject/getSetIndexBuffer';
import { getSetPipeline } from './renderobject/getSetPipeline';
import { getSetScissorRect } from './renderobject/getSetScissorRect';
import { getSetStencilReference } from './renderobject/getSetStencilReference';
import { getSetVertexBuffer } from './renderobject/getSetVertexBuffer';
import { getSetViewport } from './renderobject/getSetViewport';
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
        const renderObjectCommands = computed(() =>
        {
            const computedSetViewport = getSetViewport(renderObject);

            const computedSetScissorRect = getSetScissorRect(renderObject);

            const computedSetPipeline = getSetPipeline(renderObject);

            const computedSetStencilReference = getSetStencilReference(renderObject);

            const computedSetBlendConstant = getSetBlendConstant(renderObject);

            const computedSetBindGroup = getSetBindGroup(renderObject);

            const computedSetVertexBuffer = getSetVertexBuffer(renderObject);

            const computedSetIndexBuffer = getSetIndexBuffer(renderObject);

            return {
                viewport: computedSetViewport.value,
                scissorRect: computedSetScissorRect.value,
                pipeline: computedSetPipeline.value,
                stencilReference: computedSetStencilReference.value,
                blendConstant: computedSetBlendConstant.value,
                bindGroup: computedSetBindGroup.value,
                vertexBuffer: computedSetVertexBuffer.value,
                indexBuffer: computedSetIndexBuffer.value,
                draw: r_renderObject.draw,
            };
        });

        this.run = (device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState) =>
        {
            const { viewport, scissorRect, pipeline, stencilReference, blendConstant, bindGroup, vertexBuffer, indexBuffer, draw } = renderObjectCommands.value;

            viewport(state, attachmentSize);

            scissorRect(state, attachmentSize);

            blendConstant(state);

            stencilReference(state);

            pipeline(state, device, renderPassFormat);

            bindGroup(state, device);

            vertexBuffer(state, device);

            indexBuffer(state, device);

            state.draw(draw);
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
