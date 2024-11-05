import { getGPURenderPipeline } from "../caches/getGPURenderPipeline";
import { IGPURenderPipeline } from "../data/IGPURenderObject";

/**
 * 执行渲染管线。
 * 
 * @param device GPU设备。
 * @param passEncoder 渲染通道编码器。
 * @param pipeline 渲染管线。
 */
export function runRenderPipeline(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, pipeline: IGPURenderPipeline)
{
    const gpuRenderPipeline = getGPURenderPipeline(device, pipeline);
    passEncoder.setPipeline(gpuRenderPipeline);
}