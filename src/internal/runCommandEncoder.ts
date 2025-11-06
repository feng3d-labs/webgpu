import { CommandEncoder, CopyBufferToBuffer, CopyTextureToTexture, RenderPass } from '@feng3d/render-api';

import { runCopyBufferToBuffer } from './runCopyBufferToBuffer';
import { runCopyTextureToTexture } from './runCopyTextureToTexture';
import { WGPUComputePass } from './WGPUComputePass';
import { WGPURenderPass } from './WGPURenderPass';

export function runCommandEncoder(device: GPUDevice, commandEncoder: CommandEncoder)
{
    const gpuCommandEncoder = device.createCommandEncoder();

    commandEncoder.passEncoders.forEach((passEncoder) =>
    {
        if (!passEncoder.__type__ || passEncoder.__type__ === 'RenderPass')
        {
            const wpugRenderPass = WGPURenderPass.getInstance(device, passEncoder as RenderPass);

            wpugRenderPass.run(device, gpuCommandEncoder);

            return;
        }
        if (passEncoder.__type__ === 'ComputePass')
        {
            const wgpuComputePass = WGPUComputePass.getInstance(device, passEncoder);

            wgpuComputePass.run(device, gpuCommandEncoder);

            return;
        }
        if (passEncoder.__type__ === 'CopyTextureToTexture')
        {
            runCopyTextureToTexture(device, gpuCommandEncoder, passEncoder as CopyTextureToTexture);

            return;
        }
        if (passEncoder.__type__ === 'CopyBufferToBuffer')
        {
            runCopyBufferToBuffer(device, gpuCommandEncoder, passEncoder as CopyBufferToBuffer);
            return;
        }

        console.error(`未处理 passEncoder ${passEncoder}`);
    });

    return gpuCommandEncoder.finish();
}