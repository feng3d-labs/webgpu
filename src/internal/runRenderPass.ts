import { RenderObject, RenderPass, RenderPassObject } from '@feng3d/render-api';
import { WGPUQuerySet } from '../caches/WGPUQuerySet';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';
import { RenderBundle } from '../data/RenderBundle';
import { runRenderObject } from './runRenderObject';
import { WGPUOcclusionQuery } from './WGPUOcclusionQuery';
import { runRenderBundle } from './WGPURenderBundle';
import { runCommands, WGPURenderObjectState } from './WGPURenderObjectState';

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

    const renderPassFormat = wgpuRenderPassDescriptor.renderPassFormat;
    const attachmentSize = renderPass.descriptor.attachmentSize;

    const state = new WGPURenderObjectState(passEncoder, renderPassFormat, attachmentSize);
    const commands = state.commands;
    let queryIndex = 0;

    renderPass.renderPassObjects.forEach((element) =>
    {
        if (!element.__type__ || element.__type__ === 'RenderObject')
        {
            runRenderObject(device, renderPassFormat, attachmentSize, element as RenderObject, state);
        }
        else if (element.__type__ === 'RenderBundle')
        {
            runRenderBundle(device, commands, state, element as RenderBundle, renderPassFormat, attachmentSize);
        }
        else if (element.__type__ === 'OcclusionQuery')
        {
            const wgpuOcclusionQuery = WGPUOcclusionQuery.getInstance(device, renderPassFormat, element, attachmentSize);

            wgpuOcclusionQuery.run(device, commands, queryIndex++, state);
        }
        else
        {
            throw `未处理 ${(element as RenderPassObject).__type__} 类型的渲染通道对象！`;
        }
    });

    if (commands)
    {
        runCommands(passEncoder, commands);
    }
    passEncoder.end();

    renderPassDescriptor.timestampWrites?.resolve(commandEncoder);
    renderPassDescriptor.occlusionQuerySet?.resolve(commandEncoder);
}