import { Computed, computed, reactive } from '@feng3d/reactivity';
import { ChainMap, OcclusionQuery, RenderObject, RenderPass, RenderPassObject } from '@feng3d/render-api';
import { WGPUQuerySet } from '../caches/WGPUQuerySet';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';
import { RenderBundle } from '../data/RenderBundle';
import { runOcclusionQuery } from './runOcclusionQuery';
import { runRenderBundle } from './runRenderBundle';
import { runRenderObject } from './runRenderObject';
import { WGPURenderPassCache } from './WGPURenderObjectState';

export function runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass)
{
    const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass.descriptor);
    const renderPassDescriptor = wgpuRenderPassDescriptor.gpuRenderPassDescriptor;

    //
    const wgpuQuerySet = WGPUQuerySet.getInstance(device, renderPass);
    if (wgpuQuerySet.gpuQuerySet)
    {
        renderPassDescriptor.occlusionQuerySet = wgpuQuerySet.gpuQuerySet;
    }

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    const state = getWGPURenderPassCache(device, renderPass);

    state.runCommands(passEncoder);

    passEncoder.end();

    renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
    renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
}

function getWGPURenderPassCache(device: GPUDevice, renderPass: RenderPass)
{
    let commandsComputed = cache.get([device, renderPass]);
    if (commandsComputed) return commandsComputed.value;

    const r_renderPass = reactive(renderPass);

    commandsComputed = computed(() =>
    {
        r_renderPass.descriptor;
        const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass.descriptor);
        const renderPassFormat = wgpuRenderPassDescriptor.renderPassFormat;

        r_renderPass.descriptor.attachmentSize;
        const attachmentSize = renderPass.descriptor.attachmentSize;

        const state = new WGPURenderPassCache(renderPassFormat, attachmentSize);
        let queryIndex = 0;

        r_renderPass.renderPassObjects.concat();
        renderPass.renderPassObjects.forEach((element) =>
        {
            if (!element.__type__ || element.__type__ === 'RenderObject')
            {
                runRenderObject(device, element as RenderObject, state);
            }
            else if (element.__type__ === 'RenderBundle')
            {
                runRenderBundle(device, element as RenderBundle, state);
            }
            else if (element.__type__ === 'OcclusionQuery')
            {
                runOcclusionQuery(device, element as OcclusionQuery, queryIndex++, state);
            }
            else
            {
                throw `未处理 ${(element as RenderPassObject).__type__} 类型的渲染通道对象！`;
            }
        });

        return state;
    });

    cache.set([device, renderPass], commandsComputed);

    return commandsComputed.value;
}

const cache = new ChainMap<[GPUDevice, RenderPass], Computed<WGPURenderPassCache>>();