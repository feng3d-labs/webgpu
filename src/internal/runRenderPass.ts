import { Computed, computed } from '@feng3d/reactivity';
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

    commandsComputed = computed(() =>
    {
        const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass.descriptor);

        const renderPassFormat = wgpuRenderPassDescriptor.renderPassFormat;
        const attachmentSize = renderPass.descriptor.attachmentSize;

        const state = new WGPURenderPassCache();
        let queryIndex = 0;

        renderPass.renderPassObjects.forEach((element) =>
        {
            if (!element.__type__ || element.__type__ === 'RenderObject')
            {
                runRenderObject(device, renderPassFormat, attachmentSize, element as RenderObject, state);
            }
            else if (element.__type__ === 'RenderBundle')
            {
                runRenderBundle(device, state, element as RenderBundle, renderPassFormat, attachmentSize);
            }
            else if (element.__type__ === 'OcclusionQuery')
            {
                runOcclusionQuery(device, queryIndex++, state, element as OcclusionQuery, renderPassFormat, attachmentSize);
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