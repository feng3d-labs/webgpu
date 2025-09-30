import { computed, Computed, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderPipeline, VertexAttributes, WGSLVertexType } from '@feng3d/render-api';
import { TemplateInfo, TypeInfo } from 'wgsl_reflect';

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

    private static getWGSLType(type: TypeInfo)
    {
        let wgslType = type.name;

        if (this.isTemplateType(type))
        {
            wgslType += `<${type.format.name}>`;
        }
        if (this.wgslTypeMap[wgslType])
        {
            wgslType = this.wgslTypeMap[wgslType];
        }

        return wgslType as WGSLVertexType;
    }

    /**
     * 别名
     */
    private static readonly wgslTypeMap = {
        vec2u: 'vec2<u32>',
        vec3u: 'vec3<u32>',
        vec4u: 'vec4<u32>',
        vec2i: 'vec2<i32>',
        vec3i: 'vec3<i32>',
        vec4i: 'vec4<i32>',
        vec2f: 'vec2<f32>',
        vec3f: 'vec3<f32>',
        vec4f: 'vec4<f32>',
    };

    private static isTemplateType(type: TypeInfo): type is TemplateInfo
    {
        return !!(type as TemplateInfo).format;
    }

    private static readonly getGPURenderPipelineMap = new ChainMap<GetGPURenderPipelineKey, Computed<GPURenderPipeline>>();
}

type GetGPURenderPipelineKey = [device: GPUDevice, renderPipeline: RenderPipeline, renderPassFormat: RenderPassFormat, vertices: VertexAttributes, indexFormat: GPUIndexFormat];
