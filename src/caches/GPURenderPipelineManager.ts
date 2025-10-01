import { computed, Computed, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderPipeline, VertexAttributes } from '@feng3d/render-api';

import { RenderPassFormat } from '../internal/RenderPassFormat';
import { WGPUDepthStencilState } from './WGPUDepthStencilState';
import { WGPUFragmentState } from './WGPUFragmentState';
import { WGPUMultisampleState } from './WGPUMultisampleState';
import { WGPUPipelineLayout } from './WGPUPipelineLayout';
import { WGPUPrimitiveState } from './WGPUPrimitiveState';
import { WGPUVertexState } from './WGPUVertexState';

declare global
{
    interface GPUFragmentState
    {
        /**
         * 用于区别片段是否相同。
         */
        key?: string;
    }
}

export class GPURenderPipelineManager
{
    /**
     * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
     *
     * @param renderPipeline 渲染管线描述。
     * @param renderPass 渲染通道描述。
     * @param vertices 顶点属性数据映射。
     * @returns 完整的渲染管线描述以及顶点缓冲区数组。
     */
    static getGPURenderPipeline(device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat)
    {
        const getGPURenderPipelineKey: GetGPURenderPipelineKey = [device, renderPipeline, renderPassFormat, vertices, indexFormat];
        let result = this.getGPURenderPipelineMap.get(getGPURenderPipelineKey);

        if (result) return result.value;

        result = computed(() =>
        {
            // 监听
            const r_renderPipeline = reactive(renderPipeline);

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

            return gpuRenderPipeline;
        });
        this.getGPURenderPipelineMap.set(getGPURenderPipelineKey, result);

        return result.value;
    }

    private static readonly getGPURenderPipelineMap = new ChainMap<GetGPURenderPipelineKey, Computed<GPURenderPipeline>>();
}

type GetGPURenderPipelineKey = [device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat];
