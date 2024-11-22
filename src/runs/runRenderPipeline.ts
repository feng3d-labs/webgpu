import { getGPURenderPipeline } from "../caches/getGPURenderPipeline";
import { getIGPURenderPipeline } from "../caches/getIGPURenderPipeline";
import { IGPURenderPipeline } from "../data/IGPURenderObject";
import { IGPUVertexAttributes } from "../data/IGPUVertexAttributes";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";

/**
 * 执行渲染管线。
 * 
 * @param device GPU设备。
 * @param passEncoder 渲染通道编码器。
 * @param pipeline 渲染管线。
 */
export function runRenderPipeline(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPipeline: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IGPUVertexAttributes)
{
    const { pipeline } = getIGPURenderPipeline(renderPipeline, renderPassFormat, vertices);

    const gpuRenderPipeline = getGPURenderPipeline(device, pipeline);
    passEncoder.setPipeline(gpuRenderPipeline);
}