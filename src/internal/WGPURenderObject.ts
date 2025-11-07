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
    constructor(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        super();

        this._onCreate(device, renderObject, renderPassFormat);
        //
        WGPURenderObject.map.set([device, renderObject, renderPassFormat], this);
        this.destroyCall(() => { WGPURenderObject.map.delete([device, renderObject, renderPassFormat]); });
    }

    private _onCreate(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        const r_renderObject = reactive(renderObject);
        const renderObjectCommands = computed(() =>
        {
            const computedSetViewport = getSetViewport(renderPassFormat, renderObject);

            const computedSetScissorRect = getSetScissorRect(renderPassFormat, renderObject);

            const computedSetPipeline = getSetPipeline(device, renderObject, renderPassFormat);

            const computedSetStencilReference = getSetStencilReference(renderObject);

            const computedSetBlendConstant = getSetBlendConstant(renderObject);

            const computedSetBindGroup = getSetBindGroup(device, renderObject);

            const computedSetVertexBuffer = getSetVertexBuffer(device, renderObject);

            const computedSetIndexBuffer = getSetIndexBuffer(device, renderObject);

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

            state.setViewport(viewport);

            state.setScissorRect(scissorRect);

            state.setBlendConstant(blendConstant);

            state.setStencilReference(stencilReference);

            state.setPipeline(pipeline);

            state.setBindGroup(bindGroup);

            state.setVertexBuffer(vertexBuffer);

            state.setIndexBuffer(indexBuffer);

            state.draw(draw);
        };
    }

    run: (device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState) => void;

    static getInstance(device: GPUDevice, renderObject: RenderObject, renderPassFormat: RenderPassFormat)
    {
        return this.map.get([device, renderObject, renderPassFormat]) || new WGPURenderObject(device, renderObject, renderPassFormat);
    }
    static readonly map = new ChainMap<[GPUDevice, RenderObject, RenderPassFormat], WGPURenderObject>();
}

export interface RenderPassObjectCommand
{
    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState): void;
}

export interface PassEncoderCommand
{
    run(commandEncoder: GPUCommandEncoder): void;
}
