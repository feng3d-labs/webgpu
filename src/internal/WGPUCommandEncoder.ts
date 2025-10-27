import { CommandEncoder, RenderPass } from '@feng3d/render-api';

import { reactive } from '@feng3d/reactivity';
import { ReactiveObject } from '../ReactiveObject';
import { GDeviceContext } from './GDeviceContext';
import { WGPUComputePass } from './WGPUComputePass';
import { WGPUCopyBufferToBuffer } from './WGPUCopyBufferToBuffer';
import { WGPUCopyTextureToTexture } from './WGPUCopyTextureToTexture';
import { WGPURenderPass } from './WGPURenderPass';

export class WGPUCommandEncoder extends ReactiveObject
{
    passEncoders: (WGPURenderPass | WGPUComputePass | WGPUCopyTextureToTexture | WGPUCopyBufferToBuffer)[];

    constructor(device: GPUDevice, commandEncoder: CommandEncoder)
    {
        super();

        this._onCreate(device, commandEncoder);
        this._onMap(device, commandEncoder);
    }

    private _onCreate(device: GPUDevice, commandEncoder: CommandEncoder)
    {
        const r_commandEncoder = reactive(commandEncoder);

        this.effect(() =>
        {
            r_commandEncoder.passEncoders.concat();

            this.passEncoders = commandEncoder.passEncoders.map((passEncoder) =>
            {
                if (!passEncoder.__type__ || passEncoder.__type__ === 'RenderPass')
                {
                    const wpugRenderPass = WGPURenderPass.getInstance(device, passEncoder as RenderPass);

                    return wpugRenderPass;
                }
                else if (passEncoder.__type__ === 'ComputePass')
                {
                    const wgpuComputePass = WGPUComputePass.getInstance(device, passEncoder);

                    return wgpuComputePass;
                }
                else if (passEncoder.__type__ === 'CopyTextureToTexture')
                {
                    const wgpuCopyTextureToTexture = WGPUCopyTextureToTexture.getInstance(device, passEncoder);

                    return wgpuCopyTextureToTexture;
                }
                else if (passEncoder.__type__ === 'CopyBufferToBuffer')
                {
                    const wgpuCopyBufferToBuffer = WGPUCopyBufferToBuffer.getInstance(device, passEncoder);

                    return wgpuCopyBufferToBuffer;
                }

                console.error(`未处理 passEncoder ${passEncoder}`);

                return null;
            });
        });
    }

    run(context: GDeviceContext)
    {
        context.gpuCommandEncoder = context.device.createCommandEncoder();

        this.passEncoders.forEach((passEncoder) => passEncoder.run(context));

        return context.gpuCommandEncoder.finish();
    }

    private _onMap(device: GPUDevice, commandEncoder: CommandEncoder)
    {
        device.commandEncoderCommands ??= new WeakMap<CommandEncoder, WGPUCommandEncoder>();
        device.commandEncoderCommands.set(commandEncoder, this);
        this.destroyCall(() => { device.commandEncoderCommands.delete(commandEncoder); });
    }

    static getInstance(device: GPUDevice, commandEncoder: CommandEncoder)
    {
        return device.commandEncoderCommands?.get(commandEncoder) || new WGPUCommandEncoder(device, commandEncoder);
    }
}

declare global
{
    interface GPUDevice
    {
        commandEncoderCommands: WeakMap<CommandEncoder, WGPUCommandEncoder>;
    }
}