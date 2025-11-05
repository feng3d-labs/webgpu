import { ChainMap, CommandEncoder, RenderPass } from '@feng3d/render-api';

import { computed, reactive } from '@feng3d/reactivity';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUComputePass } from './WGPUComputePass';
import { WGPUCopyBufferToBuffer } from './WGPUCopyBufferToBuffer';
import { WGPUCopyTextureToTexture } from './WGPUCopyTextureToTexture';
import { WGPURenderPass } from './WGPURenderPass';

export class WGPUCommandEncoder extends ReactiveObject
{
    run: (device: GPUDevice) => GPUCommandBuffer;

    constructor(device: GPUDevice, commandEncoder: CommandEncoder)
    {
        super();

        this._onCreate(device, commandEncoder);
        //
        WGPUCommandEncoder.map.set([device, commandEncoder], this);
        this.destroyCall(() => { WGPUCommandEncoder.map.delete([device, commandEncoder]); });
    }

    private _onCreate(device: GPUDevice, commandEncoder: CommandEncoder)
    {
        const r_commandEncoder = reactive(commandEncoder);

        const computedPassEncoders = computed(() =>
        {
            r_commandEncoder.passEncoders.concat();

            const passEncoders = commandEncoder.passEncoders.map((passEncoder) =>
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

            return passEncoders;
        });

        this.run = (device: GPUDevice) =>
        {
            const passEncoders = computedPassEncoders.value;

            const gpuCommandEncoder = device.createCommandEncoder();

            passEncoders.forEach((passEncoder) => passEncoder.run(device, gpuCommandEncoder));

            return gpuCommandEncoder.finish();
        };
    }

    static getInstance(device: GPUDevice, commandEncoder: CommandEncoder)
    {
        return this.map.get([device, commandEncoder]) || new WGPUCommandEncoder(device, commandEncoder);
    }
    static readonly map = new ChainMap<[GPUDevice, CommandEncoder], WGPUCommandEncoder>();
}
