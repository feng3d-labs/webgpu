import { computed, Computed, reactive } from '@feng3d/reactivity';
import { ChainMap } from '@feng3d/render-api';
import { RenderBundle } from '../data/RenderBundle';
import { RenderPassFormat } from './RenderPassFormat';
import { runRenderObject } from './runRenderObject';
import { CommandType, runCommands, WGPURenderObjectState } from './WGPURenderObjectState';

export function runRenderBundle(device: GPUDevice, commands: CommandType[], state: WGPURenderObjectState, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
{
    const gpuRenderBundle = getGPURenderBundle(device, renderBundle, renderPassFormat, attachmentSize);

    commands.push(['executeBundles', [[gpuRenderBundle]]]);
}

export function getGPURenderBundle(device: GPUDevice, renderBundle: RenderBundle, renderPassFormat: RenderPassFormat, attachmentSize: { readonly width: number, readonly height: number })
{
    let computedGpuRenderBundle = map.get([device, renderBundle, renderPassFormat, attachmentSize]);
    if (computedGpuRenderBundle)
    {
        return computedGpuRenderBundle.value;
    }

    const r_renderBundle = reactive(renderBundle);
    const r_renderPassFormat = reactive(renderPassFormat);

    computedGpuRenderBundle = computed(() =>
    {
        // 执行
        r_renderPassFormat.colorFormats.concat();
        const descriptor: GPURenderBundleEncoderDescriptor = { colorFormats: renderPassFormat.colorFormats };
        if (r_renderPassFormat.depthStencilFormat)
        {
            descriptor.depthStencilFormat = renderPassFormat.depthStencilFormat;
        }
        if (r_renderPassFormat.sampleCount)
        {
            descriptor.sampleCount = renderPassFormat.sampleCount;
        }
        if (r_renderBundle.descriptor?.depthReadOnly)
        {
            descriptor.depthReadOnly = true;
        }
        if (r_renderBundle.descriptor?.stencilReadOnly)
        {
            descriptor.stencilReadOnly = true;
        }
        //
        const renderBundleEncoder = device.createRenderBundleEncoder(descriptor);

        //
        const bundleState = new WGPURenderObjectState(null, renderPassFormat, attachmentSize);

        r_renderBundle.renderObjects.concat();
        renderBundle.renderObjects.forEach((renderObject) =>
        {
            runRenderObject(device, renderPassFormat, attachmentSize, renderObject, bundleState);
        });

        const bundleCommands = bundleState.commands.filter((command) => (
            command[0] !== 'setViewport'
            && command[0] !== 'setScissorRect'
            && command[0] !== 'setBlendConstant'
            && command[0] !== 'setStencilReference'
        ));

        runCommands(renderBundleEncoder, bundleCommands);

        const gpuRenderBundle = renderBundleEncoder.finish();

        return gpuRenderBundle;
    });

    map.set([device, renderBundle, renderPassFormat, attachmentSize], computedGpuRenderBundle);

    return computedGpuRenderBundle.value;
}

const map = new ChainMap<[GPUDevice, RenderBundle, RenderPassFormat, { readonly width: number, readonly height: number }], Computed<GPURenderBundle>>();