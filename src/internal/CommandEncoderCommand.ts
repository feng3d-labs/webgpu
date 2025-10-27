import { CommandEncoder, RenderPass } from '@feng3d/render-api';

import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';
import { WGPURenderPass } from './WGPURenderPass';
import { WGPUComputePass } from './WGPUComputePass';
import { WGPUCopyBufferToBuffer } from './WGPUCopyBufferToBuffer';
import { WGPUCopyTextureToTexture } from './WGPUCopyTextureToTexture';

export class CommandEncoderCommand
{
    static getInstance(webgpu: WebGPU, commandEncoder: CommandEncoder)
    {
        return new CommandEncoderCommand(webgpu, commandEncoder);
    }

    constructor(public readonly webgpu: WebGPU, public readonly commandEncoder: CommandEncoder)
    {
        this.passEncoders = commandEncoder.passEncoders.map((passEncoder) =>
        {
            if (!passEncoder.__type__)
            {
                const renderPassCommand = WGPURenderPass.getInstance(this.webgpu.device, passEncoder as RenderPass);

                return renderPassCommand;
            }
            else if (passEncoder.__type__ === 'RenderPass')
            {
                const renderPassCommand = WGPURenderPass.getInstance(this.webgpu.device, passEncoder);

                return renderPassCommand;
            }
            else if (passEncoder.__type__ === 'ComputePass')
            {
                const computePassCommand = WGPUComputePass.getInstance(this.webgpu.device, passEncoder);

                return computePassCommand;
            }
            else if (passEncoder.__type__ === 'CopyTextureToTexture')
            {
                const copyTextureToTextureCommand = WGPUCopyTextureToTexture.getInstance(this.webgpu.device, passEncoder);

                return copyTextureToTextureCommand;
            }
            else if (passEncoder.__type__ === 'CopyBufferToBuffer')
            {
                const copyBufferToBufferCommand = WGPUCopyBufferToBuffer.getInstance(this.webgpu, passEncoder);

                return copyBufferToBufferCommand;
            }

            console.error(`未处理 passEncoder ${passEncoder}`);

            return null;
        });
    }

    run(context: GDeviceContext)
    {
        context.gpuCommandEncoder = context.device.createCommandEncoder();

        this.passEncoders.forEach((passEncoder) => passEncoder.run(context));

        return context.gpuCommandEncoder.finish();
    }

    passEncoders: (WGPURenderPass | WGPUComputePass | WGPUCopyTextureToTexture | WGPUCopyBufferToBuffer)[];
}
