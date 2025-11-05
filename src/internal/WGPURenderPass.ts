import { computed, reactive } from '@feng3d/reactivity';
import { ChainMap, RenderObject, RenderPass, RenderPassObject } from '@feng3d/render-api';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUOcclusionQuery } from './WGPUOcclusionQuery';
import { WGPURenderBundle } from './WGPURenderBundle';
import { CommandType, runCommands, WGPURenderObject, WGPURenderObjectState } from './WGPURenderObject';

export class WGPURenderPass extends ReactiveObject
{
    constructor(device: GPUDevice, public readonly renderPass: RenderPass)
    {
        super();

        this._onCreate(device, renderPass);
        //
        WGPURenderPass.map.set([device, renderPass], this);
        this.destroyCall(() => { WGPURenderPass.map.delete([device, renderPass]); });
    }

    private _onCreate(device: GPUDevice, renderPass: RenderPass)
    {
        const r_renderPass = reactive(renderPass);

        const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass);

        const computedCommands = computed(() =>
        {
            const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass);

            const renderPassFormat = wgpuRenderPassDescriptor.renderPassFormat;

            if (r_renderPass.renderPassObjects)
            {
                const commands: CommandType[] = [];
                const state = new WGPURenderObjectState();
                let queryIndex = 0;

                r_renderPass.renderPassObjects.concat();
                renderPass.renderPassObjects.forEach((element) =>
                {
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
                });

                return commands;
            }

            return null;
        });

        this.run = (device: GPUDevice, commandEncoder: GPUCommandEncoder) =>
        {
            const commands = computedCommands.value;
            const renderPassDescriptor = wgpuRenderPassDescriptor.gpuRenderPassDescriptor;

            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

            if (commands)
            {
                runCommands(passEncoder, commands);
            }
            passEncoder.end();

            renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
            renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
        }
    }

    run: (device: GPUDevice, commandEncoder: GPUCommandEncoder) => void;

    static getInstance(device: GPUDevice, renderPass: RenderPass)
    {
        return this.map.get([device, renderPass]) || new WGPURenderPass(device, renderPass);
    }
    private static readonly map = new ChainMap<[GPUDevice, RenderPass], WGPURenderPass>();
}
