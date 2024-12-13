import { IRenderObject } from "@feng3d/render-api";
import { IGPUIndicesDataTypes } from "../data/IGPURenderObject";
import { getIGPUIndexBuffer } from "../internal/getIGPUIndexBuffer";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { NGPURenderObject, NGPUSetBindGroup, NGPUSetIndexBuffer, NGPUVertexBuffer1 } from "../internal/NGPURenderObject";
import { getGPUBindGroup } from "./getGPUBindGroup";
import { getGPUBuffer } from "./getGPUBuffer";
import { getGPURenderPipeline } from "./getGPURenderPipeline";
import { getIGPUVertexBuffer } from "./getIGPUBuffer";
import { IGPUShader } from "./getIGPUPipelineLayout";
import { getIGPUSetBindGroups } from "./getIGPUSetBindGroups";
import { getNGPURenderPipeline } from "./getNGPURenderPipeline";

export function getNGPURenderObject(device: GPUDevice, renderPassFormat: IGPURenderPassFormat, renderObject: IRenderObject)
{
    const { pipeline, vertices, indices, bindingResources, drawVertex, drawIndexed } = renderObject;

    const shader: IGPUShader = { vertex: pipeline.vertex.code, fragment: pipeline.fragment?.code };

    // 
    const { pipeline: nPipeline, vertexBuffers } = getNGPURenderPipeline(pipeline, renderPassFormat, vertices, indices);
    const gpuRenderPipeline = getGPURenderPipeline(device, nPipeline);

    // 计算 bindGroups
    const setBindGroups = getIGPUSetBindGroups(shader, bindingResources);
    const gpuBindGroups: NGPUSetBindGroup[] = setBindGroups?.map((setBindGroup, index) =>
    {
        const gpuBindGroup = getGPUBindGroup(device, setBindGroup.bindGroup);
        return { bindGroup: gpuBindGroup, dynamicOffsets: setBindGroup.dynamicOffsets } as NGPUSetBindGroup;
    });

    // 
    const gpuVertexBuffers = vertexBuffers?.map((vertexBuffer, index) =>
    {
        const buffer = getIGPUVertexBuffer(vertexBuffer.data)
        const gBuffer = getGPUBuffer(device, buffer);

        return { gBuffer, offset: vertexBuffer.offset, size: vertexBuffer.size } as NGPUVertexBuffer1;
    });

    //
    const setIndexBuffer = getNGPUSetIndexBuffer(device, indices);

    //
    const nRenderObject: NGPURenderObject = {
        pipeline: gpuRenderPipeline,
        setBindGroups: gpuBindGroups,
        vertexBuffers: gpuVertexBuffers,
        setIndexBuffer,
        drawVertex,
        drawIndexed,
        stencilReference: nPipeline.stencilReference,
    };

    return nRenderObject;
}

export function getNGPUSetIndexBuffer(device: GPUDevice, indices: IGPUIndicesDataTypes)
{
    if (!indices) return undefined;

    const indexBuffer = getIGPUIndexBuffer(indices);

    const { buffer, indexFormat, offset, size } = indexBuffer;
    const gBuffer = getGPUBuffer(device, buffer);

    const setIndexBuffer: NGPUSetIndexBuffer = {
        gBuffer, indexFormat, offset, size
    };

    return setIndexBuffer;
}