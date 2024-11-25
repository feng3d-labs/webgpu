import { IGPUCommandEncoder } from "../data/IGPUCommandEncoder";
import { IGPUComputePass } from "../data/IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";
import { IGPURenderPass } from "../data/IGPURenderPass";
import { runComputePass } from "./runComputePass";
import { runCopyBufferToBuffer } from "./runCopyBufferToBuffer";
import { runCopyTextureToTexture } from "./runCopyTextureToTexture";
import { runRenderPass } from "./runRenderPass";

export function runCommandEncoder(device: GPUDevice, commandEncoder: IGPUCommandEncoder)
{
    const gpuCommandEncoder = device.createCommandEncoder();

    commandEncoder.passEncoders.forEach((passEncoder) =>
    {
        if ((passEncoder as IGPURenderPass).descriptor)
        {
            runRenderPass(device, gpuCommandEncoder, passEncoder as IGPURenderPass);
        }
        else if ((passEncoder as IGPUComputePass).computeObjects)
        {
            runComputePass(device, gpuCommandEncoder, passEncoder as IGPUComputePass);
        }
        else if ((passEncoder as IGPUCopyTextureToTexture).source?.texture)
        {
            runCopyTextureToTexture(device, gpuCommandEncoder, passEncoder as IGPUCopyTextureToTexture);
        }
        else if ((passEncoder as IGPUCopyBufferToBuffer).source)
        {
            runCopyBufferToBuffer(device, gpuCommandEncoder, passEncoder as IGPUCopyBufferToBuffer);
        }
        else
        {
            console.error(`未处理 passEncoder`);
        }
    });

    return gpuCommandEncoder.finish();
}
