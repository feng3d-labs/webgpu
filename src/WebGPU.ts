import { IBuffer, ISubmit, ITextureLike } from "@feng3d/render-api";
import { getGPUBuffer } from "./caches/getGPUBuffer";
import { getGPUTexture } from "./caches/getGPUTexture";
import { getIGPUTextureLikeSize } from "./caches/getIGPUTextureSize";
import { IGPUReadPixels } from "./data/IGPUReadPixels";
import { RunWebGPU } from "./runs/RunWebGPU";
import { RunWebGPUCommandCache } from "./runs/RunWebGPUCommandCache";
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
    private _runWebGPU: RunWebGPU = new RunWebGPUCommandCache();

    /**
     * 初始化 WebGPU 获取 GPUDevice 。
     */
    async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        const adapter = await navigator.gpu?.requestAdapter(options);
        // 获取支持的特性
        const features: GPUFeatureName[] = [];
        adapter?.features.forEach((v) => { features.push(v as any); });
        // 判断请求的特性是否被支持
        const requiredFeatures = Array.from(descriptor?.requiredFeatures || []);
        if (requiredFeatures.length > 0)
        {
            for (let i = requiredFeatures.length - 1; i >= 0; i--)
            {
                if (features.indexOf(requiredFeatures[i]) === -1)
                {
                    console.error(`当前 GPUAdapter 不支持特性 ${requiredFeatures[i]}！`);
                    requiredFeatures.splice(i, 1);
                }
            }
            descriptor.requiredFeatures = requiredFeatures;
        }
        // 默认开启当前本机支持的所有WebGPU特性。
        descriptor = descriptor || {};
        descriptor.requiredFeatures = (descriptor.requiredFeatures || features) as any;
        //
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

    /**
     * 提交 GPU 。
     *
     * @param submit 一次 GPU 提交内容。
     *
     * @see GPUQueue.submit
     */
    submit(submit: ISubmit)
    {
        this._runWebGPU.runSubmit(this.device, submit);
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: ITextureLike)
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
    textureInvertYPremultiplyAlpha(texture: ITextureLike, options: { invertY?: boolean, premultiplyAlpha?: boolean })
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
    copyDepthTexture(sourceTexture: ITextureLike, targetTexture: ITextureLike)
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

    /**
     * 从GPU缓冲区读取数据到CPU。
     *
     * @param buffer GPU缓冲区。
     * @param offset 读取位置。
     * @param size 读取字节数量。
     * @returns CPU数据缓冲区。
     */
    async readBuffer(buffer: IBuffer, offset?: GPUSize64, size?: GPUSize64)
    {
        const gpuBuffer = getGPUBuffer(this.device, buffer);
        await gpuBuffer.mapAsync(GPUMapMode.READ);

        const result = gpuBuffer.getMappedRange(offset, size).slice(0);

        gpuBuffer.unmap();

        return result;
    }

    getGPUTextureSize(input: ITextureLike)
    {
        return getIGPUTextureLikeSize(input);
    }
}
