import { CommandEncoder, RenderPass } from '@feng3d/render-api';

import { WebGPU } from '../WebGPU';
import { ComputePassCommand } from './ComputePassCommand';
import { CopyBufferToBufferCommand } from './CopyBufferToBufferCommand';
import { CopyTextureToTextureCommand } from './CopyTextureToTextureCommand';
import { RenderPassCommand } from './RenderPassCommand';

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
                const renderPassCommand = RenderPassCommand.getInstance(this.webgpu, passEncoder as RenderPass);

                return renderPassCommand;
            }
            else if (passEncoder.__type__ === 'RenderPass')
            {
                const renderPassCommand = RenderPassCommand.getInstance(this.webgpu, passEncoder);

                return renderPassCommand;
            }
            else if (passEncoder.__type__ === 'ComputePass')
            {
                const computePassCommand = ComputePassCommand.getInstance(this.webgpu, passEncoder);

                return computePassCommand;
            }
            else if (passEncoder.__type__ === 'CopyTextureToTexture')
            {
                const copyTextureToTextureCommand = CopyTextureToTextureCommand.getInstance(this.webgpu, passEncoder);

                return copyTextureToTextureCommand;
            }
            else if (passEncoder.__type__ === 'CopyBufferToBuffer')
            {
                const copyBufferToBufferCommand = CopyBufferToBufferCommand.getInstance(this.webgpu, passEncoder);

                return copyBufferToBufferCommand;
            }

            console.error(`未处理 passEncoder ${passEncoder}`);

            return null;
        });
    }

    run(device: GPUDevice)
    {
        const gpuCommandEncoder = device.createCommandEncoder();

        gpuCommandEncoder.device = device;
        this.passEncoders.forEach((passEncoder) => passEncoder.run(gpuCommandEncoder));

        return gpuCommandEncoder.finish();
    }

    passEncoders: (RenderPassCommand | ComputePassCommand | CopyTextureToTextureCommand | CopyBufferToBufferCommand)[];
}
