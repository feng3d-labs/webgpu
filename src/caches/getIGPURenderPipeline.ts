import { watcher } from "@feng3d/watcher";

import { IGPUDepthStencilState, IGPUFragmentState, IGPURenderPipeline, IGPUVertexState } from "../data/IGPURenderObject";
import { IGPURenderPassDescriptor } from "../data/IGPURenderPassDescriptor";
import { IGPUVertexAttributes } from "../data/IGPUVertexAttributes";
import { IGPUVertexBuffer } from "../data/IGPUVertexBuffer";
import { gpuVertexFormatMap } from "../types/VertexFormat";
import { ChainMap } from "../utils/ChainMap";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";
import { getIRenderPassColorAttachmentFormats } from "./getIRenderPassColorAttachmentFormats";
import { getIRenderPassDepthStencilAttachmentFormats } from "./getIRenderPassDepthStencilAttachmentFormats";
import { WGSLBindingResourceInfoMap, WGSLVertexAttributeInfo, getWGSLReflectInfo } from "./getWGSLReflectInfo";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *
 * @param renderPipeline 渲染管线描述。
 * @param renderPass 渲染通道描述。
 * @param vertices 顶点属性数据映射。
 * @returns 完整的渲染管线描述以及顶点缓冲区数组。
 */
export function getIGPURenderPipeline(device: GPUDevice, renderPipeline: IGPURenderPipeline, renderPass: IGPURenderPassDescriptor, vertices: IGPUVertexAttributes)
{
    let result = renderPipelineMap.get([renderPipeline, renderPass, vertices]);
    if (!result)
    {
        // 获取完整的顶点阶段描述与顶点缓冲区列表。
        const { gpuVertexState, vertexBuffers } = getIGPUVertexState(renderPipeline.vertex, vertices);

        // 获取片段阶段完整描述。
        const gpuFragmentState = getIGPUFragmentState(device, renderPipeline.fragment, renderPass);

        // 获取深度模板阶段完整描述。
        const gpuDepthStencilState = getGPUDepthStencilState(device, renderPipeline.depthStencil, renderPass);

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
    [IGPURenderPipeline, IGPURenderPassDescriptor, IGPUVertexAttributes],
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
function getGPUDepthStencilState(device: GPUDevice, depthStencil: IGPUDepthStencilState, renderPass: IGPURenderPassDescriptor)
{
    // 获取渲染通道附件纹理格式。
    const depthStencilAttachmentTextureFormat = getIRenderPassDepthStencilAttachmentFormats(device, renderPass);

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

/**
 * 获取完整的顶点阶段描述与顶点缓冲区列表。
 *
 * @param vertexState 顶点阶段信息。
 * @param vertices 顶点数据。
 * @returns 完整的顶点阶段描述与顶点缓冲区列表。
 */
function getIGPUVertexState(vertexState: IGPUVertexState, vertices: IGPUVertexAttributes)
{
    let result = vertexStateMap.get([vertexState, vertices]);
    if (!result)
    {
        const code = vertexState.code;

        // 解析顶点着色器
        const reflect = getWGSLReflectInfo(code);
        //
        let entryPoint = vertexState.entryPoint;
        if (!entryPoint)
        {
            console.assert(reflect.vertexEntryList.length > 0, `WGSL着色器 ${code} 中不存在顶点入口点。`);
            entryPoint = reflect.vertexEntryList[0].entryPoint;
        }
        else
        {
            console.assert(!!reflect.vertexEntryMap[entryPoint], `WGSL着色器 ${code} 中不存在指定顶点入口点 ${entryPoint} 。`);
        }
        //
        const attributeInfos = reflect.vertexEntryMap[entryPoint].attributeInfos;

        const { vertexBufferLayouts, vertexBuffers } = getVertexBuffers(attributeInfos, vertices);

        const gpuVertexState: IGPUVertexState = {
            code,
            entryPoint,
            buffers: vertexBufferLayouts,
        };
        if (vertexState.constants)
        {
            gpuVertexState.constants = vertexState.constants;
        }

        result = { gpuVertexState, vertexBuffers };
        vertexStateMap.set([vertexState, vertices], result);
    }

    return result;
}

const vertexStateMap = new ChainMap<[IGPUVertexState, IGPUVertexAttributes], {
    gpuVertexState: IGPUVertexState;
    vertexBuffers: IGPUVertexBuffer[];
}>();

/**
 * 从顶点属性信息与顶点数据中获取顶点缓冲区布局数组以及顶点缓冲区数组。
 *
 * @param attributeInfos 顶点属性信息。
 * @param vertices 顶点数据。
 * @returns 顶点缓冲区布局数组以及顶点缓冲区数组。
 */
function getVertexBuffers(attributeInfos: WGSLVertexAttributeInfo[], vertices: IGPUVertexAttributes)
{
    const vertexBufferLayouts: GPUVertexBufferLayout[] = [];

    const vertexBuffers: IGPUVertexBuffer[] = [];

    const map: WeakMap<any, number> = new WeakMap();

    attributeInfos.forEach((v) =>
    {
        let format: GPUVertexFormat = v.format;
        const shaderLocation = v.shaderLocation;
        const attributeName = v.name;

        const vertexAttribute = vertices[attributeName];
        console.assert(!!vertexAttribute, `在提供的顶点属性数据中未找到 ${attributeName} 。`);
        let isIGPUVertexBufferOffset = false;
        //
        const data = vertexAttribute.buffer;
        let attributeOffset = vertexAttribute.offset;
        let arrayStride = vertexAttribute.vertexSize;
        const stepMode = vertexAttribute.stepMode;
        //
        if (vertexAttribute.format)
        {
            format = vertexAttribute.format;
        }
        else
        {
            // 根据顶点数据调整 布局中的数据格式。
            if (vertexAttribute.numComponents !== undefined)
            {
                const formats = format.split("x");
                if (vertexAttribute.numComponents > 1)
                {
                    format = [formats[0], vertexAttribute.numComponents].join("x") as any;
                }
                else
                {
                    format = formats[0] as any;
                }
            }
        }

        // 如果 偏移值大于 单个顶点尺寸，则该值被放入 IGPUVertexBuffer.offset。
        const vertexByteSize = gpuVertexFormatMap[format].byteSize;
        if (attributeOffset + vertexByteSize > arrayStride)
        {
            isIGPUVertexBufferOffset = true;
        }

        watcher.watch(vertexAttribute, "buffer", () =>
        {
            const index = map.get(data);
            const buffer = vertexAttribute.buffer;

            vertexBuffers[index].buffer = buffer;
        });

        //
        if (!attributeOffset)
        {
            attributeOffset = 0;
        }

        //
        if (!arrayStride)
        {
            arrayStride = gpuVertexFormatMap[format].byteSize;
        }

        let index = map.get(data);
        if (index === undefined)
        {
            index = vertexBufferLayouts.length;
            map.set(data, index);

            const gpuBuffer = data;

            vertexBuffers[index] = { buffer: gpuBuffer, offset: isIGPUVertexBufferOffset ? attributeOffset : 0 };

            //
            vertexBufferLayouts[index] = { stepMode, arrayStride, attributes: [] };
        }
        else if (isIGPUVertexBufferOffset)
        {
            const gpuBuffer = vertexBuffers[index].buffer;

            // 使用相同 data 共用 gpuBuffer。
            index = vertexBufferLayouts.length;

            vertexBuffers[index] = { buffer: gpuBuffer, offset: isIGPUVertexBufferOffset ? attributeOffset : 0 };

            //
            vertexBufferLayouts[index] = { stepMode, arrayStride, attributes: [] };
        }
        else
        {
            // 要求同一顶点缓冲区中 arrayStride 与 stepMode 必须相同。
            const gpuVertexBufferLayout = vertexBufferLayouts[index];
            console.assert(gpuVertexBufferLayout.arrayStride === arrayStride);
            console.assert(gpuVertexBufferLayout.stepMode === stepMode);
        }

        (vertexBufferLayouts[index].attributes as Array<GPUVertexAttribute>).push({ shaderLocation, offset: isIGPUVertexBufferOffset ? 0 : attributeOffset, format });
    });

    return { vertexBufferLayouts, vertexBuffers };
}

/**
 * 获取片段阶段完整描述。
 *
 * @param fragmentState 片段简单阶段。
 * @param colorAttachmentTextureFormats 颜色附件格式。
 * @returns 片段阶段完整描述。
 */
function getIGPUFragmentState(device: GPUDevice, fragmentState: IGPUFragmentState, renderPass: IGPURenderPassDescriptor)
{
    if (!fragmentState)
    {
        return undefined;
    }

    let gpuFragmentState = fragmentStateMap.get([fragmentState, renderPass]);
    if (!gpuFragmentState)
    {
        // 获取渲染通道附件纹理格式。
        const colorAttachmentTextureFormats = getIRenderPassColorAttachmentFormats(device, renderPass);

        const code = fragmentState.code;
        let entryPoint = fragmentState.entryPoint;
        if (!entryPoint)
        {
            const reflect = getWGSLReflectInfo(code);
            console.assert(reflect.fragmentEntryList.length > 0, `WGSL着色器 ${code} 中不存在片元入口点。`);
            entryPoint = reflect.fragmentEntryList[0].entryPoint;
        }
        else
        {
            // 验证着色器中包含指定片段入口函数。
            const reflect = getWGSLReflectInfo(code);
            console.assert(!!reflect.fragmentEntryMap[entryPoint], `WGSL着色器 ${code} 中不存在指定的片元入口点 ${entryPoint} 。`);
        }

        const targets = colorAttachmentTextureFormats.map((v, i) =>
        {
            if (!v) return undefined;

            const gpuColorTargetState: GPUColorTargetState = { format: v };

            const colorTargetState = fragmentState.targets?.[i];
            if (colorTargetState)
            {
                Object.assign(gpuColorTargetState, colorTargetState);
            }

            return gpuColorTargetState;
        });

        gpuFragmentState = {
            code,
            entryPoint,
            targets,
        };

        if (fragmentState.constants)
        {
            gpuFragmentState.constants = fragmentState.constants;
        }

        fragmentStateMap.set([fragmentState, renderPass], gpuFragmentState);
    }

    return gpuFragmentState;
}

const fragmentStateMap = new ChainMap<[IGPUFragmentState, IGPURenderPassDescriptor], IGPUFragmentState>();
