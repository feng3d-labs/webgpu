import { reactive } from '@feng3d/reactivity';
import { ChainMap, RenderPipeline, VertexAttributes } from '@feng3d/render-api';

import { RenderPassFormat } from '../internal/RenderPassFormat';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUDepthStencilState } from './WGPUDepthStencilState';
import { WGPUFragmentState } from './WGPUFragmentState';
import { WGPUMultisampleState } from './WGPUMultisampleState';
import { WGPUPipelineLayout } from './WGPUPipelineLayout';
import { WGPUPrimitiveState } from './WGPUPrimitiveState';
import { WGPUVertexState } from './WGPUVertexState';

export class WGPURenderPipeline extends ReactiveObject
{
    readonly gpuRenderPipeline: GPURenderPipeline;

    constructor(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat)
    {
        super();
        this._onCreateGPURenderPipeline(device, renderPipeline, renderPassFormat, vertices, indexFormat);

        this._onMap(device, renderPipeline, renderPassFormat, vertices, indexFormat);
    }

    private _onCreateGPURenderPipeline(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat)
    {
        const r_this = reactive(this);
        const r_renderPipeline = reactive(renderPipeline);

        this.effect(() =>
        {
            // 监听
            r_renderPipeline.label;
            r_renderPipeline.fragment;
            r_renderPipeline.primitive;
            r_renderPipeline.depthStencil;
            // r_renderPipeline.vertex
            r_renderPipeline.vertex.code;
            // r_renderPipeline.fragment
            r_renderPipeline.fragment?.code;
            r_renderPipeline.multisample;

            // 计算
            const { label, vertex, fragment, primitive, depthStencil, multisample } = renderPipeline;
            const { colorFormats, depthStencilFormat, sampleCount } = renderPassFormat;

            //
            const layout = WGPUPipelineLayout.getGPUPipelineLayout(device, { vertex: vertex.code, fragment: fragment?.code });

            //
            const wgpuVertexState = WGPUVertexState.getInstance(device, vertex, vertices);
            reactive(wgpuVertexState).gpuVertexState;
            const gpuVertexState = wgpuVertexState.gpuVertexState;

            //
            const wgpuFragmentState = WGPUFragmentState.getInstance(device, fragment, colorFormats);
            reactive(wgpuFragmentState).gpuFragmentState;
            const gpuFragmentState = wgpuFragmentState.gpuFragmentState;

            //
            const wgpuDepthStencilState = WGPUDepthStencilState.getInstance(depthStencil, depthStencilFormat);
            reactive(wgpuDepthStencilState).gpuDepthStencilState;
            const gpuDepthStencilState = wgpuDepthStencilState.gpuDepthStencilState;

            //
            let gpuMultisampleState: GPUMultisampleState = undefined;
            if (sampleCount)
            {
                const wgpuMultisampleState = WGPUMultisampleState.getInstance(multisample);
                reactive(wgpuMultisampleState).gpuMultisampleState;
                gpuMultisampleState = wgpuMultisampleState.gpuMultisampleState;
            }

            //
            const wgpuPrimitiveState = WGPUPrimitiveState.getInstance(primitive, indexFormat);
            reactive(wgpuPrimitiveState).gpuPrimitiveState;
            const gpuPrimitiveState = wgpuPrimitiveState.gpuPrimitiveState;

            //
            const gpuRenderPipelineDescriptor: GPURenderPipelineDescriptor = {
                label,
                layout,
                vertex: gpuVertexState,
                fragment: gpuFragmentState,
                primitive: gpuPrimitiveState,
                depthStencil: gpuDepthStencilState,
                multisample: gpuMultisampleState,
            };

            const gpuRenderPipeline = device.createRenderPipeline(gpuRenderPipelineDescriptor);

            r_this.gpuRenderPipeline = gpuRenderPipeline;
        });
    }

    private _onMap(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat)
    {
        device.renderPipelines ??= new ChainMap()
        device.renderPipelines.set([renderPipeline, renderPassFormat, vertices, indexFormat], this);
        this.destroyCall(() => { device.renderPipelines.delete([renderPipeline, renderPassFormat, vertices, indexFormat]); });
    }

    static getInstance(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat)
    {
        return device.renderPipelines?.get([renderPipeline, renderPassFormat, vertices, indexFormat]) || new WGPURenderPipeline(device, renderPipeline, renderPassFormat, vertices, indexFormat);
    }
}

type GetGPURenderPipelineKey = [device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat];

declare global
{
    interface GPUDevice
    {
        renderPipelines?: ChainMap<[renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat], WGPURenderPipeline>;
    }
}