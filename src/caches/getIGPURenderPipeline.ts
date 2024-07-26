import { IRenderPass } from "../data/IRenderPass";
import { IDepthStencilState, IRenderPipeline } from "../data/IRenderPipeline";
import { IVertexAttributes } from "../data/IVertexAttributes";
import { ChainMap } from "../utils/ChainMap";
import { IGPURenderPipeline } from "../webgpu-data-driven/data/IGPURenderObject";
import { IGPUVertexBuffer } from "../webgpu-data-driven/data/IGPUVertexBuffer";
import { getIGPUFragmentState } from "./getIGPUFragmentState";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";
import { getIRenderPassDepthStencilAttachmentFormats } from "./getIGPURenderPass";
import { getIGPUVertexState } from "./getIGPUVertexState";
import { WGSLBindingResourceInfoMap } from "./getWGSLReflectInfo";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *
 * @param renderPipeline 渲染管线描述。
 * @param renderPass 渲染通道描述。
 * @param vertices 顶点属性数据映射。
 * @returns 完整的渲染管线描述以及顶点缓冲区数组。
 */
export function getIGPURenderPipeline(renderPipeline: IRenderPipeline, renderPass: IRenderPass, vertices: IVertexAttributes)
{
    let result = renderPipelineMap.get([renderPipeline, renderPass, vertices]);
    if (!result)
    {
        // 获取完整的顶点阶段描述与顶点缓冲区列表。
        const { gpuVertexState, vertexBuffers } = getIGPUVertexState(renderPipeline.vertex, vertices);

        // 获取片段阶段完整描述。
        const gpuFragmentState = getIGPUFragmentState(renderPipeline.fragment, renderPass);

        // 获取深度模板阶段完整描述。
        const gpuDepthStencilState = getGPUDepthStencilState(renderPipeline.depthStencil, renderPass);

        // 从GPU管线中获取管线布局。
        const { gpuPipelineLayout, bindingResourceInfoMap } = getIGPUPipelineLayout(renderPipeline);

        // 从渲染通道上获取多重采样数量
        const multisample: GPUMultisampleState = {
            ...renderPipeline.multisample,
            count: renderPass.multisample,
        };

        //
        const pipeline: IGPURenderPipeline = {
            ...renderPipeline,
            layout: gpuPipelineLayout,
            vertex: gpuVertexState,
            fragment: gpuFragmentState,
            depthStencil: gpuDepthStencilState,
            multisample,
        };

        result = { pipeline, vertexBuffers, bindingResourceInfoMap };
        renderPipelineMap.set([renderPipeline, renderPass, vertices], result);
    }

    return result;
}

const renderPipelineMap = new ChainMap<
    [IRenderPipeline, IRenderPass, IVertexAttributes],
    {
        /**
         * GPU渲染管线描述。
         */
        pipeline: IGPURenderPipeline;
        /**
         * GPU渲染时使用的顶点缓冲区列表。
         */
        vertexBuffers: IGPUVertexBuffer[];
        /**
         * WebGPU着色器中绑定资源映射。
         */
        bindingResourceInfoMap: WGSLBindingResourceInfoMap;
    }
>();

/**
 * 获取深度模板阶段完整描述。
 *
 * @param depthStencil 深度模板阶段描述。
 * @param depthStencilAttachmentTextureFormat 深度模板附件纹理格式。
 * @returns 深度模板阶段完整描述。
 */
function getGPUDepthStencilState(depthStencil: IDepthStencilState, renderPass: IRenderPass)
{
    // 获取渲染通道附件纹理格式。
    const depthStencilAttachmentTextureFormat = getIRenderPassDepthStencilAttachmentFormats(renderPass);

    let gpuDepthStencilState: GPUDepthStencilState;
    if (depthStencilAttachmentTextureFormat)
    {
        const depthWriteEnabled = depthStencil?.depthWriteEnabled ?? true;
        const depthCompare = depthStencil?.depthCompare ?? "less";
        const format = depthStencilAttachmentTextureFormat;

        gpuDepthStencilState = {
            depthWriteEnabled,
            depthCompare,
            format,
        };
    }

    return gpuDepthStencilState;
}
