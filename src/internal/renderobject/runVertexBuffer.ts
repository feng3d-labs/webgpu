import { reactive } from "@feng3d/reactivity";
import { Buffer, RenderObject } from "@feng3d/render-api";
import { WGPUBuffer } from "../../caches/WGPUBuffer";
import { WGPUVertexBufferLayout } from "../../caches/WGPUVertexBufferLayout";
import { WGPURenderObjectState } from "../WGPURenderObjectState";

export function runVertexBuffer(renderObject: RenderObject, state: WGPURenderObjectState, device: GPUDevice)
{
    const r_renderObject = reactive(renderObject);
    r_renderObject.vertices;
    r_renderObject.pipeline.vertex;

    const wgpuVertexBufferLayout = WGPUVertexBufferLayout.getInstance(renderObject.pipeline.vertex, renderObject.vertices);
    const vertexDatas = wgpuVertexBufferLayout.vertexDatas;

    vertexDatas?.forEach((data, index) =>
    {
        // 执行
        const offset = data.byteOffset;
        const size = data.byteLength;
        const buffer = Buffer.getBuffer(data.buffer);

        if (!buffer.label)
        {
            reactive(buffer).label = (`顶点数据 ${autoVertexIndex++}`);
        }

        const wgpuBuffer = WGPUBuffer.getInstance(device, buffer);
        const gpuBuffer = wgpuBuffer.gpuBuffer;

        state.setVertexBuffer(index, gpuBuffer, offset, size);
    });
}
let autoVertexIndex = 0;