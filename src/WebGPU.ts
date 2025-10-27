import { computed, Computed, reactive } from '@feng3d/reactivity';
import { Buffer, ChainMap, ReadPixels, Submit, TextureLike } from '@feng3d/render-api';

import { WGPUBuffer } from './caches/WGPUBuffer';
import { WGPUTextureLike } from './caches/WGPUTextureLike';
import './data/polyfills/RenderObject';
import './data/polyfills/RenderPass';
import { RenderBundle } from './data/RenderBundle';
import { GDeviceContext } from './internal/GDeviceContext';
import { RenderBundleCommand } from './internal/RenderBundleCommand';
import { RenderPassFormat } from './internal/RenderPassFormat';
import { SubmitCommand } from './internal/SubmitCommand';
import { CommandType, WGPURenderObject, WGPURenderObjectState } from './internal/WGPURenderObject';
import { copyDepthTexture } from './utils/copyDepthTexture';
import { getGPUDevice } from './utils/getGPUDevice';
import { readPixels } from './utils/readPixels';
import { textureInvertYPremultiplyAlpha } from './utils/textureInvertYPremultiplyAlpha';

/**
 * WebGPU
 */
export class WebGPU
{
    /**
     * 初始化 WebGPU 获取 GPUDevice 。
     */
    async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        const r_this = reactive(this);

        r_this.device = await getGPUDevice(options, descriptor);
        //
        this.device?.lost.then(async (info) =>
        {
            console.error(`WebGPU device was lost: ${info.message}`);

            // 'reason' will be 'destroyed' if we intentionally destroy the device.
            if (info.reason !== 'destroyed')
            {
                // try again
                r_this.device = await getGPUDevice(options, descriptor);
            }
        });

        return this;
    }

    readonly device: GPUDevice;

    constructor(device?: GPUDevice)
    {
        this.device = device;
    }

    destroy()
    {
        const r_this = reactive(this);

        r_this.device = null;
    }

    submit(submit: Submit)
    {
        const device = this.device;

        const submitCommand = SubmitCommand.getInstance(this, submit);

        const context = GDeviceContext.getInstance(device);

        submitCommand.run(context);
    }

    destoryTexture(texture: TextureLike)
    {
        const device = this.device;

        if ('context' in texture)
        {
            device.canvasTextures?.get(texture)?.destroy();

            return;
        }

        device.textures?.get(texture)?.destroy();
    }

    textureInvertYPremultiplyAlpha(texture: TextureLike, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        const device = this.device;
        const gpuTexture = WGPUTextureLike.getInstance(this.device, texture);

        textureInvertYPremultiplyAlpha(device, gpuTexture.gpuTexture, options);
    }

    copyDepthTexture(sourceTexture: TextureLike, targetTexture: TextureLike)
    {
        const device = this.device;
        const gpuSourceTexture = WGPUTextureLike.getInstance(this.device, sourceTexture);
        const gpuTargetTexture = WGPUTextureLike.getInstance(this.device, targetTexture);

        copyDepthTexture(device, gpuSourceTexture.gpuTexture, gpuTargetTexture.gpuTexture);
    }

    async readPixels(gpuReadPixels: ReadPixels)
    {
        const device = this.device;
        const gpuTexture = WGPUTextureLike.getInstance(this.device, gpuReadPixels.texture);

        const result = await readPixels(device, {
            ...gpuReadPixels,
            texture: gpuTexture.gpuTexture,
        });

        gpuReadPixels.result = result;

        return result;
    }

    async readBuffer(buffer: Buffer, offset?: GPUSize64, size?: GPUSize64)
    {
        const device = this.device;
        const gpuBuffer = WGPUBuffer.getInstance(device, buffer).gpuBuffer;

        await gpuBuffer.mapAsync(GPUMapMode.READ);

        const result = gpuBuffer.getMappedRange(offset, size).slice(0);

        gpuBuffer.unmap();

        return result;
    }

    runRenderBundle(renderPassFormat: RenderPassFormat, renderBundleObject: RenderBundle)
    {
        const gpuRenderBundleKey: GPURenderBundleKey = [renderBundleObject, renderPassFormat];
        let result = gpuRenderBundleMap.get(gpuRenderBundleKey);

        if (result) return result.value;

        const renderBundleCommand = new RenderBundleCommand();

        result = computed(() =>
        {
            // 监听
            const r_renderBundleObject = reactive(renderBundleObject);

            r_renderBundleObject.renderObjects;
            r_renderBundleObject.descriptor?.depthReadOnly;
            r_renderBundleObject.descriptor?.stencilReadOnly;

            // 执行
            const descriptor: GPURenderBundleEncoderDescriptor = { ...renderBundleObject.descriptor, ...renderPassFormat };

            renderBundleCommand.descriptor = descriptor;

            //
            const commands: CommandType[] = [];
            const state = new WGPURenderObjectState();

            renderBundleObject.renderObjects.forEach((renderObject) =>
            {
                const wgpuRenderObject = WGPURenderObject.getInstance(this.device, renderObject, renderPassFormat);

                wgpuRenderObject.run(undefined, commands, state);
            });

            renderBundleCommand.bundleCommands = commands.filter((command) => (
                command[0] !== 'setViewport'
                && command[0] !== 'setScissorRect'
                && command[0] !== 'setBlendConstant'
                && command[0] !== 'setStencilReference'
            ));

            return renderBundleCommand;
        });
        gpuRenderBundleMap.set(gpuRenderBundleKey, result);

        return result.value;
    }
}

type GPURenderBundleKey = [renderBundle: RenderBundle, renderPassFormat: RenderPassFormat];
const gpuRenderBundleMap = new ChainMap<GPURenderBundleKey, Computed<RenderBundleCommand>>();
