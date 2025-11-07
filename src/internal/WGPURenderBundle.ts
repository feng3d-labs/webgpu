import { computed, reactive } from '@feng3d/reactivity';
import { ChainMap } from '@feng3d/render-api';
import { RenderBundle } from '../data/RenderBundle';
import { ReactiveObject } from '../ReactiveObject';
import { RenderPassFormat } from './RenderPassFormat';
import { RenderPassObjectCommand, WGPURenderObject } from './WGPURenderObject';
import { CommandType, runCommands, WGPURenderObjectState } from './WGPURenderObjectState';

export class WGPURenderBundle extends ReactiveObject implements RenderPassObjectCommand
{
    constructor(device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
    {
        super();

        this._onCreate(device, renderBundle, renderPassFormat, attachmentSize);
        //
        WGPURenderBundle.map.set([device, renderBundle, renderPassFormat], this);
        this.destroyCall(() => { WGPURenderBundle.map.delete([device, renderBundle, renderPassFormat]); });
    }

    private _onCreate(device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
    {
        // 监听
        const r_renderBundleObject = reactive(renderBundle);

        const computedDescriptor = computed(() =>
        {
            r_renderBundleObject.descriptor?.depthReadOnly;
            r_renderBundleObject.descriptor?.stencilReadOnly;

            // 执行
            const descriptor: GPURenderBundleEncoderDescriptor = { ...renderBundle.descriptor, ...renderPassFormat };
            return descriptor;
        });

        const computedBundleCommands = computed(() =>
        {
            r_renderBundleObject.renderObjects.concat();

            //
            const commands: CommandType[] = [];
            const state = new WGPURenderObjectState(null, renderPassFormat, attachmentSize);

            renderBundle.renderObjects.forEach((renderObject) =>
            {
                const wgpuRenderObject = WGPURenderObject.getInstance(renderObject, renderPassFormat, attachmentSize);

                wgpuRenderObject.run(undefined, commands, state);
            });

            const bundleCommands = commands.filter((command) => (
                command[0] !== 'setViewport'
                && command[0] !== 'setScissorRect'
                && command[0] !== 'setBlendConstant'
                && command[0] !== 'setStencilReference'
            ));

            return bundleCommands;
        });

        const computedGpuRenderBundle = computed(() =>
        {
            //
            const renderBundleEncoder = device.createRenderBundleEncoder(computedDescriptor.value);

            runCommands(renderBundleEncoder, computedBundleCommands.value);

            const gpuRenderBundle = renderBundleEncoder.finish();

            return gpuRenderBundle;
        });

        this.run = (device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState) =>
        {
            commands.push(['executeBundles', [[computedGpuRenderBundle.value]]]);
        }
    }

    run: (device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState) => void;

    static getInstance(device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
    {
        return this.map.get([device, renderBundle, renderPassFormat]) || new WGPURenderBundle(device, renderBundle, renderPassFormat, attachmentSize);
    }
    static readonly map = new ChainMap<[GPUDevice, RenderBundle, RenderPassFormat], WGPURenderBundle>();
}
