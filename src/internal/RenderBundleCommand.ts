import { CommandType, RenderObjectCache, RenderPassObjectCommand, runCommands } from './RenderObjectCache';

export class RenderBundleCommand implements RenderPassObjectCommand
{
    gpuRenderBundle: GPURenderBundle;
    descriptor: GPURenderBundleEncoderDescriptor;
    bundleCommands: CommandType[];
    run(device: GPUDevice, commands: CommandType[], state: RenderObjectCache): void
    {
        if (!this.gpuRenderBundle)
        {
            //
            const renderBundleEncoder = device.createRenderBundleEncoder(this.descriptor);

            runCommands(renderBundleEncoder, this.bundleCommands);

            this.gpuRenderBundle = renderBundleEncoder.finish();
        }

        commands.push(['executeBundles', [this.gpuRenderBundle]]);
    }
}