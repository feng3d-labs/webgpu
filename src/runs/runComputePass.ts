import { IGPUComputePass } from "../data/IGPUComputePass";
import { runComputeObject } from "./runComputeObject";

/**
 * 执行计算通道。
 *
 * @param device GPU设备。
 * @param commandEncoder 命令编码器。
 * @param computePass 计算通道。
 */
export function runComputePass(device: GPUDevice, commandEncoder: GPUCommandEncoder, computePass: IGPUComputePass)
{
    const passEncoder = commandEncoder.beginComputePass(computePass.descriptor);

    computePass.computeObjects.forEach((computeObject) =>
    {
        runComputeObject(device, passEncoder, computeObject);
    });

    passEncoder.end();
}