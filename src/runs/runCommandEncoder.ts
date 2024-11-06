import { IGPUCommandEncoder } from "../data/IGPUCommandEncoder";
import { IGPUComputePass } from "../data/IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "../data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "../data/IGPUCopyTextureToTexture";
import { IGPURenderPass } from "../data/IGPURenderPass";
import { runComputePass } from "./runComputePass";
import { runCopyBufferToBuffer } from "./runCopyBufferToBuffer";
import { runCopyTextureToTexture } from "./runCopyTextureToTexture";
import { runRenderPass } from "./runRenderPass";

export function runCommandEncoder(device: GPUDevice, v: IGPUCommandEncoder)
{
    const gpuCommandEncoder = device.createCommandEncoder();

    v.passEncoders.forEach((v) =>
    {
        if ((v as IGPURenderPass).descriptor)
        {
            runRenderPass(device, gpuCommandEncoder, v as IGPURenderPass);
        }
        else if ((v as IGPUComputePass).computeObjects)
        {
            runComputePass(device, gpuCommandEncoder, v as IGPUComputePass);
        }
        else if ((v as IGPUCopyTextureToTexture).source?.texture)
        {
            runCopyTextureToTexture(device, gpuCommandEncoder, v as IGPUCopyTextureToTexture);
        }
        else if ((v as IGPUCopyBufferToBuffer).source)
        {
            runCopyBufferToBuffer(device, gpuCommandEncoder, v as IGPUCopyBufferToBuffer);
        }
        else
        {
            console.error(`未处理 passEncoder`);
        }
    });

    return gpuCommandEncoder.finish();
}
