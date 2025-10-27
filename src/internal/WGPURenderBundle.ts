import { reactive } from '@feng3d/reactivity';
import { ChainMap } from '@feng3d/render-api';
import { RenderBundle } from '../data/RenderBundle';
import { ReactiveObject } from '../ReactiveObject';
import { RenderPassFormat } from './RenderPassFormat';
import { CommandType, RenderPassObjectCommand, runCommands, WGPURenderObject, WGPURenderObjectState } from './WGPURenderObject';

export class WGPURenderBundle extends ReactiveObject implements RenderPassObjectCommand
{
    gpuRenderBundle: GPURenderBundle;
    descriptor: GPURenderBundleEncoderDescriptor;
    bundleCommands: CommandType[];

    constructor(device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat)
    {
        super();

        this._onCreate(device, renderBundle, renderPassFormat);
        this._onMap(device, renderBundle, renderPassFormat);
    }

    private _onCreate(device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat)
    {

        // 监听
        const r_renderBundleObject = reactive(renderBundle);

        this.effect(() =>
        {
            r_renderBundleObject.renderObjects;
            r_renderBundleObject.descriptor?.depthReadOnly;
            r_renderBundleObject.descriptor?.stencilReadOnly;

            // 执行
            const descriptor: GPURenderBundleEncoderDescriptor = { ...renderBundle.descriptor, ...renderPassFormat };

            this.descriptor = descriptor;

            //
            const commands: CommandType[] = [];
            const state = new WGPURenderObjectState();

            renderBundle.renderObjects.forEach((renderObject) =>
            {
                const wgpuRenderObject = WGPURenderObject.getInstance(device, renderObject, renderPassFormat);

                wgpuRenderObject.run(undefined, commands, state);
            });

            this.bundleCommands = commands.filter((command) => (
                command[0] !== 'setViewport'
                && command[0] !== 'setScissorRect'
                && command[0] !== 'setBlendConstant'
                && command[0] !== 'setStencilReference'
            ));
        });

    }

    private _onMap(device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat)
    {
        device.renderBundles ??= new ChainMap();
        device.renderBundles.set([renderBundle, renderPassFormat], this);
        this.destroyCall(() => { device.renderBundles.delete([renderBundle, renderPassFormat]); });
    }

    run(device: GPUDevice, commands: CommandType[], state: WGPURenderObject): void
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

    static getInstance(device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat)
    {
        return device.renderBundles?.get([renderBundle, renderPassFormat]) || new WGPURenderBundle(device, renderBundle, renderPassFormat);
    }
}

declare global
{
    interface GPUDevice
    {
        renderBundles: ChainMap<[renderBundle: RenderBundle, renderPassFormat: RenderPassFormat], WGPURenderBundle>;
    }
}