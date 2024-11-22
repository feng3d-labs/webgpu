import { getGPUBuffer } from "../caches/getGPUBuffer";
import { getIGPURenderPipeline } from "../caches/getIGPURenderPipeline";
import { IGPURenderPipeline } from "../data/IGPURenderObject";
import { IGPUVertexAttributes } from "../data/IGPUVertexAttributes";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { getIGPUBuffer } from "./getIGPUIndexBuffer";

export function runVertices(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPipeline: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IGPUVertexAttributes)
{
    const { vertexBuffers } = getIGPURenderPipeline(renderPipeline, renderPassFormat, vertices);

    vertexBuffers?.forEach((vertexBuffer, index) =>
    {
        const buffer = getIGPUBuffer(vertexBuffer.data);
        buffer.label = buffer.label || ("顶点索引 " + autoVertexIndex++);
        const gBuffer = getGPUBuffer(device, buffer);
        passEncoder.setVertexBuffer(index, gBuffer, vertexBuffer.offset, vertexBuffer.size);
    });
}

let autoVertexIndex = 0;