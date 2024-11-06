import { getGPUTexture } from "./caches/getGPUTexture";
import { getGPUTextureSize } from "./caches/getIGPUTexture";
import { IGPUSubmit } from "./data/IGPUSubmit";
import { IGPUTexture } from "./data/IGPUTexture";
import { runSubmit } from "./runs/runSubmit";
import { copyDepthTexture } from "./utils/copyDepthTexture";
import { readPixels } from "./utils/readPixels";
import { textureInvertYPremultiplyAlpha } from "./utils/textureInvertYPremultiplyAlpha";

/**
 * WebGPU 对象。
 *
 * 提供 `WebGPU` 操作入口 {@link WebGPU.submit}。
 */
export class WebGPU
{
    /**
     * 初始化 WebGPU 获取 GPUDevice 。
     */
    async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        if (!navigator.gpu)
        {
            throw "this browser does not support WebGPU";
        }

        const adapter = await navigator.gpu.requestAdapter(options);
        if (!adapter)
        {
            throw "this browser supports webgpu but it appears disabled";
        }

        const device = await adapter?.requestDevice(descriptor);

        device.lost.then(async (info) =>
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
    submit(submit: IGPUSubmit)
    {
        runSubmit(this.device, submit);
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: IGPUTexture)
    {
        const gpuTexture = getGPUTexture(this.device, texture, false);
        if (gpuTexture)
        {
            gpuTexture.destroy();
        }
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
     * @param texture GPU纹理
     * @param x 纹理读取X坐标。
     * @param y 纹理读取Y坐标。
     * @param width 纹理读取宽度。
     * @param height 纹理读取高度。
     *
     * @returns 读取到的数据。
     */
    async readPixels(params: { texture: IGPUTexture, origin: GPUOrigin3D, copySize: { width: number, height: number } })
    {
        const gpuTexture = getGPUTexture(this.device, params.texture, false);

        const result = await readPixels(this.device, {
            ...params,
            texture: gpuTexture,
        });

        return result;
    }

    getGPUTextureSize(input: IGPUTexture)
    {
        return getGPUTextureSize(this.device, input);
    }
}
