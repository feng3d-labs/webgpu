import { computed, Computed, effect, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderObject, RenderPass, RenderPassObject } from '@feng3d/render-api';
import { GPURenderPassDescriptorManager } from '../caches/GPURenderPassDescriptorManager';
import { GPURenderPassFormatManager } from '../caches/GPURenderPassFormatManager';
import { WebGPU } from '../WebGPU';
import { CommandType, RenderObjectCache, RenderPassObjectCommand, runCommands } from './RenderObjectCache';
import { RenderPassFormat } from './RenderPassFormat';

export class RenderPassCommand
{
    static getInstance(webgpu: WebGPU, renderPass: RenderPass)
    {
        return new RenderPassCommand(webgpu, renderPass);
    }

    readonly renderPassFormat: RenderPassFormat;

    constructor(public readonly webgpu: WebGPU, public readonly renderPass: RenderPass)
    {
        const r_renderPass = reactive(renderPass);

        this.renderPassDescriptor = GPURenderPassDescriptorManager.getGPURenderPassDescriptor(webgpu.device, renderPass);

        effect(() =>
        {
            r_renderPass.descriptor;

            const { descriptor } = renderPass;

            reactive(this).renderPassFormat = GPURenderPassFormatManager.getGPURenderPassFormat(descriptor);
        });

        effect(() =>
        {
            r_renderPass.renderPassObjects;
            r_renderPass.descriptor;

            const { descriptor, renderPassObjects } = renderPass;

            const renderPassFormat = GPURenderPassFormatManager.getGPURenderPassFormat(descriptor);

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
                    const occlusionQueryCache = webgpu.runRenderOcclusionQueryObject(renderPassFormat, element);

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

    run(commandEncoder: GPUCommandEncoder)
    {
        const { renderPassDescriptor, commands } = this;
        const { device } = commandEncoder;

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        passEncoder.device = device;

        runCommands(passEncoder, commands);
        passEncoder.end();

        renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
        renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
    }

    renderPassDescriptor: GPURenderPassDescriptor;
    commands: CommandType[];
}

type RenderPassObjectCommandsKey = [renderPassObjects: readonly RenderPassObject[], renderPassFormat: RenderPassFormat];