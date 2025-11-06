import { CommandEncoder, RenderPass } from '@feng3d/render-api';

import { WGPUComputePass } from './WGPUComputePass';
import { WGPUCopyBufferToBuffer } from './WGPUCopyBufferToBuffer';
import { WGPUCopyTextureToTexture } from './WGPUCopyTextureToTexture';
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
            const wgpuCopyTextureToTexture = WGPUCopyTextureToTexture.getInstance(device, passEncoder);

            wgpuCopyTextureToTexture.run(device, gpuCommandEncoder);

            return;
        }
        if (passEncoder.__type__ === 'CopyBufferToBuffer')
        {
            const wgpuCopyBufferToBuffer = WGPUCopyBufferToBuffer.getInstance(device, passEncoder);

            wgpuCopyBufferToBuffer.run(device, gpuCommandEncoder);

            return;
        }

        console.error(`未处理 passEncoder ${passEncoder}`);
    });

    return gpuCommandEncoder.finish();
}