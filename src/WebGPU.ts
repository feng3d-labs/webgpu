import { getGPUTexture } from "./caches/getGPUTexture";
import { getGPUTextureSize } from "./caches/getGPUTextureSize";
import { IGPUComputeObject } from "./data/IGPUComputeObject";
import { IGPUComputePass } from "./data/IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "./data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./data/IGPUCopyTextureToTexture";
import { IGPUReadPixels } from "./data/IGPUReadPixels";
import { IGPURenderObject } from "./data/IGPURenderObject";
import { IGPURenderPass } from "./data/IGPURenderPass";
import { IGPURenderPassDescriptor } from "./data/IGPURenderPassDescriptor";
import { IGPUSubmit } from "./data/IGPUSubmit";
import { IGPUTexture } from "./data/IGPUTexture";
import { RunWebGPU } from "./RunWebGPU";
import { copyDepthTexture } from "./utils/copyDepthTexture";
import { quitIfWebGPUNotAvailable } from "./utils/quitIfWebGPUNotAvailable";
import { readPixels } from "./utils/readPixels";
import { textureInvertYPremultiplyAlpha } from "./utils/textureInvertYPremultiplyAlpha";

/**
 * WebGPU 对象。
 *
 * 提供 `WebGPU` 操作入口 {@link WebGPU.submit}。
 */
export class WebGPU
{
    runWebGPU = new RunWebGPU();

    /**
     * 初始化 WebGPU 获取 GPUDevice 。
     */
    async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        const adapter = await navigator.gpu?.requestAdapter(options);
        const device = await adapter?.requestDevice(descriptor);
        quitIfWebGPUNotAvailable(adapter, device);

        device?.lost.then(async (info) =>
        {
            console.error(`WebGPU device was lost: ${info.message}`);

            // 'reason' will be 'destroyed' if we intentionally destroy the device.
            if (info.reason !== "destroyed")
            {
                // try again
                await this.init(options, descriptor);
            }
        });

        this.device = device;

        return this;
    }

    public device: GPUDevice;

    private _currentSubmit: IGPUSubmit;
    private _currentRenderPassEncoder: IGPURenderPass;
    private _currentComputePassEncoder: IGPUComputePass;

    renderPass(descriptor: IGPURenderPassDescriptor)
    {
        this._currentSubmit = this._currentSubmit || { commandEncoders: [{ passEncoders: [] }] };
        //
        if (this._currentRenderPassEncoder?.descriptor === descriptor) return;
        //
        this._currentRenderPassEncoder = { descriptor: descriptor, renderObjects: [] };
        this._currentComputePassEncoder = null;
        this._currentSubmit.commandEncoders[0].passEncoders.push(this._currentRenderPassEncoder);
    }

    renderObject(renderObject: IGPURenderObject)
    {
        this._currentRenderPassEncoder.renderObjects.push(renderObject);
    }

    computePass()
    {
        this._currentSubmit = this._currentSubmit || { commandEncoders: [{ passEncoders: [] }] };
        //
        this._currentRenderPassEncoder = null;
        this._currentComputePassEncoder = { computeObjects: [] };
        this._currentSubmit.commandEncoders[0].passEncoders.push(this._currentComputePassEncoder);
    }

    computeObject(computeObject: IGPUComputeObject)
    {
        this._currentComputePassEncoder.computeObjects.push(computeObject);
    }

    copyTextureToTexture(copyTextureToTexture: IGPUCopyTextureToTexture)
    {
        this._currentSubmit = this._currentSubmit || { commandEncoders: [{ passEncoders: [] }] };

        this._currentRenderPassEncoder = null;
        this._currentComputePassEncoder = null;
        this._currentSubmit.commandEncoders[0].passEncoders.push(copyTextureToTexture);
    }

    copyBufferToBuffer(copyBufferToBuffer: IGPUCopyBufferToBuffer)
    {
        this._currentSubmit = this._currentSubmit || { commandEncoders: [{ passEncoders: [] }] };

        this._currentRenderPassEncoder = null;
        this._currentComputePassEncoder = null;
        this._currentSubmit.commandEncoders[0].passEncoders.push(copyBufferToBuffer);
    }

    /**
     * 提交 GPU 。
     *
     * @param submit 一次 GPU 提交内容。
     *
     * @see GPUQueue.submit
     */
    submit(submit?: IGPUSubmit)
    {
        if (submit)
        {
            this.runWebGPU.runSubmit(this.device, submit);
        }
        else
        {
            if (!this._currentSubmit) return;
            this.runWebGPU.runSubmit(this.device, this._currentSubmit);
            this._currentSubmit = null;
            this._currentRenderPassEncoder = null;
            this._currentComputePassEncoder = null;
        }
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: IGPUTexture)
    {
        getGPUTexture(this.device, texture, false)?.destroy();
    }

    /**
     * 操作纹理进行Y轴翻转或进行预乘Alpha。
     *
     * @param texture 被操作的纹理。
     * @param invertY 是否Y轴翻转
     * @param premultiplyAlpha 是否预乘Alpha。
     */
    textureInvertYPremultiplyAlpha(texture: IGPUTexture, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        const gpuTexture = getGPUTexture(this.device, texture);

        textureInvertYPremultiplyAlpha(this.device, gpuTexture, options);
    }

    /**
     * 拷贝 深度纹理到 普通纹理。
     *
     * @param device GPU设备。
     * @param sourceTexture 源纹理。
     * @param targetTexture 目标纹理。
     */
    copyDepthTexture(sourceTexture: IGPUTexture, targetTexture: IGPUTexture)
    {
        const gpuSourceTexture = getGPUTexture(this.device, sourceTexture);
        const gpuTargetTexture = getGPUTexture(this.device, targetTexture);

        copyDepthTexture(this.device, gpuSourceTexture, gpuTargetTexture);
    }

    /**
     * 从 GPU纹理 上读取数据。
     *
     * @param gpuReadPixels
     *
     * @returns 读取到的数据。
     */
    async readPixels(gpuReadPixels: IGPUReadPixels)
    {
        const gpuTexture = getGPUTexture(this.device, gpuReadPixels.texture, false);

        const result = await readPixels(this.device, {
            ...gpuReadPixels,
            texture: gpuTexture,
        });

        gpuReadPixels.result = result;

        return result;
    }

    getGPUTextureSize(input: IGPUTexture)
    {
        return getGPUTextureSize(input);
    }
}
