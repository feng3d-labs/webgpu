import { computed, Computed, effect, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderObject, RenderPass, RenderPassObject } from '@feng3d/render-api';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';
import { WGPURenderPassFormat } from '../caches/WGPURenderPassFormat';
import { WebGPU } from '../WebGPU';
import { GDeviceContext } from './GDeviceContext';
import { OcclusionQueryCache } from './OcclusionQueryCache';
import { CommandType, RenderObjectCache, RenderPassObjectCommand, runCommands } from './RenderObjectCache';
import { RenderPassFormat } from './RenderPassFormat';

export class RenderPassCommand
{
    static getInstance(webgpu: WebGPU, renderPass: RenderPass)
    {
        return new RenderPassCommand(webgpu, renderPass);
    }

    constructor(public readonly webgpu: WebGPU, public readonly renderPass: RenderPass)
    {
        const r_renderPass = reactive(renderPass);

        effect(() =>
        {
            r_renderPass.renderPassObjects;
            r_renderPass.descriptor;

            const { descriptor, renderPassObjects } = renderPass;

            const wgpuRenderPassFormat = WGPURenderPassFormat.getInstance(webgpu.device, descriptor);
            reactive(wgpuRenderPassFormat).renderPassFormat;

            const renderPassFormat = wgpuRenderPassFormat.renderPassFormat;

            const renderPassObjectCommands = this.runRenderPassObjects(webgpu, renderPassFormat, renderPassObjects);
            const commands: CommandType[] = [];
            const state = new RenderObjectCache();

            renderPassObjectCommands?.forEach((command) =>
            {
                command.run(webgpu.device, commands, state);
            });
            this.commands = commands;
        });
    }

    runRenderPassObjects(webgpu: WebGPU, renderPassFormat: RenderPassFormat, renderPassObjects: readonly RenderPassObject[])
    {
        const renderPassObjectCommandsKey: RenderPassObjectCommandsKey = [renderPassObjects, renderPassFormat];
        let result = this._renderPassObjectCommandsMap.get(renderPassObjectCommandsKey);

        if (result) return result.value;

        result = computed(() =>
        {
            let queryIndex = 0;
            const renderPassObjectCommands: RenderPassObjectCommand[] = renderPassObjects?.map((element) =>
            {
                if (!element.__type__)
                {
                    return webgpu.runRenderObject(renderPassFormat, element as RenderObject);
                }
                if (element.__type__ === 'RenderObject')
                {
                    return webgpu.runRenderObject(renderPassFormat, element);
                }
                if (element.__type__ === 'RenderBundle')
                {
                    return webgpu.runRenderBundle(renderPassFormat, element);
                }
                if (element.__type__ === 'OcclusionQuery')
                {
                    const occlusionQueryCache = OcclusionQueryCache.getInstance(webgpu, renderPassFormat, element);

                    occlusionQueryCache.queryIndex = queryIndex++;

                    return occlusionQueryCache;
                }

                throw `未处理 ${(element as RenderPassObject).__type__} 类型的渲染通道对象！`;
            });

            return renderPassObjectCommands;
        });

        this._renderPassObjectCommandsMap.set(renderPassObjectCommandsKey, result);

        return result.value;
    }

    private _renderPassObjectCommandsMap = new ChainMap<RenderPassObjectCommandsKey, Computed<RenderPassObjectCommand[]>>();

    run(context: GDeviceContext)
    {
        const { commands } = this;

        const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(context.device, this.renderPass);
        reactive(wgpuRenderPassDescriptor).gpuRenderPassDescriptor;
        const renderPassDescriptor = wgpuRenderPassDescriptor.gpuRenderPassDescriptor;

        const commandEncoder = context.gpuCommandEncoder;

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        runCommands(passEncoder, commands);
        passEncoder.end();

        renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
        renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
    }

    commands: CommandType[];
}

type RenderPassObjectCommandsKey = [renderPassObjects: readonly RenderPassObject[], renderPassFormat: RenderPassFormat];