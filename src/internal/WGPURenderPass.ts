import { reactive } from '@feng3d/reactivity';
import { RenderObject, RenderPass, RenderPassObject } from '@feng3d/render-api';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';
import { WGPURenderPassFormat } from '../caches/WGPURenderPassFormat';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUOcclusionQuery } from './WGPUOcclusionQuery';
import { WGPURenderBundle } from './WGPURenderBundle';
import { CommandType, runCommands, WGPURenderObject, WGPURenderObjectState } from './WGPURenderObject';

export class WGPURenderPass extends ReactiveObject
{
    commands: CommandType[];

    constructor(device: GPUDevice, public readonly renderPass: RenderPass)
    {
        super();

        this._onCreate(device, renderPass);
        this._onMap(device, renderPass);
    }

    private _onCreate(device: GPUDevice, renderPass: RenderPass)
    {
        const r_renderPass = reactive(renderPass);

        this.effect(() =>
        {
            r_renderPass.renderPassObjects;
            r_renderPass.descriptor;

            const { descriptor, renderPassObjects } = renderPass;

            const wgpuRenderPassFormat = WGPURenderPassFormat.getInstance(device, descriptor);
            reactive(wgpuRenderPassFormat).renderPassFormat;

            const renderPassFormat = wgpuRenderPassFormat.renderPassFormat;

            const commands: CommandType[] = [];

            if (renderPassObjects)
            {
                const state = new WGPURenderObjectState();
                let queryIndex = 0;
                for (let i = 0, len = renderPassObjects.length; i < len; i++)
                {
                    const element = renderPassObjects[i];
                    if (!element.__type__ || element.__type__ === 'RenderObject')
                    {
                        const wgpuRenderObject = WGPURenderObject.getInstance(device, element as RenderObject, renderPassFormat);

                        wgpuRenderObject.run(device, commands, state);
                    }
                    else if (element.__type__ === 'RenderBundle')
                    {
                        const wgpuRenderBundle = WGPURenderBundle.getInstance(device, element, renderPassFormat);

                        wgpuRenderBundle.run(device, commands, state);
                    }
                    else if (element.__type__ === 'OcclusionQuery')
                    {
                        const wgpuOcclusionQuery = WGPUOcclusionQuery.getInstance(device, renderPassFormat, element);

                        wgpuOcclusionQuery.queryIndex = queryIndex++;
                        wgpuOcclusionQuery.run(device, commands, state);
                    }
                    else
                    {
                        throw `未处理 ${(element as RenderPassObject).__type__} 类型的渲染通道对象！`;
                    }
                }
            }

            this.commands = commands;
        });
    }

    run(device: GPUDevice, commandEncoder: GPUCommandEncoder)
    {
        const { commands } = this;

        const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, this.renderPass);
        reactive(wgpuRenderPassDescriptor).gpuRenderPassDescriptor;
        const renderPassDescriptor = wgpuRenderPassDescriptor.gpuRenderPassDescriptor;

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        runCommands(passEncoder, commands);
        passEncoder.end();

        renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
        renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
    }

    private _onMap(device: GPUDevice, renderPass: RenderPass)
    {
        device.renderPasses ??= new WeakMap<RenderPass, WGPURenderPass>();
        device.renderPasses.set(renderPass, this);
        this.destroyCall(() => { device.renderPasses.delete(renderPass); });
    }

    static getInstance(device: GPUDevice, renderPass: RenderPass)
    {
        return device.renderPasses?.get(renderPass) || new WGPURenderPass(device, renderPass);
    }
}

declare global
{
    interface GPUDevice
    {
        renderPasses: WeakMap<RenderPass, WGPURenderPass>;
    }
}