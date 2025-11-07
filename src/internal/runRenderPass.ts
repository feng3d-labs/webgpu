import { RenderObject, RenderPass, RenderPassObject } from '@feng3d/render-api';
import { WGPURenderPassDescriptor } from '../caches/WGPURenderPassDescriptor';
import { WGPUOcclusionQuery } from './WGPUOcclusionQuery';
import { WGPURenderBundle } from './WGPURenderBundle';
import { WGPURenderObject } from './WGPURenderObject';
import { runCommands, WGPURenderObjectState } from './WGPURenderObjectState';

export function runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: RenderPass)
{
    const wgpuRenderPassDescriptor = WGPURenderPassDescriptor.getInstance(device, renderPass);
    const renderPassDescriptor = wgpuRenderPassDescriptor.gpuRenderPassDescriptor;

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    const renderPassFormat = wgpuRenderPassDescriptor.renderPassFormat;

    const state = new WGPURenderObjectState(passEncoder);
    const commands = state.commands;
    let queryIndex = 0;

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