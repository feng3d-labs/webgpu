import { GBuffer, ReadPixels, Submit, TextureLike } from "@feng3d/render-api";
import { getTextureSize } from "./caches/getTextureSize";
import "./data/polyfills/ReadPixels";
import { RunWebGPUCommandCache } from "./runs/RunWebGPUCommandCache";
import { getGPUDevice } from "./utils/getGPUDevice";

/**
 * WebGPU 对象。
 *
 * 提供 `WebGPU` 操作入口 {@link WebGPU.submit}。
 */
export class WebGPU
{
    private _runWebGPU: RunWebGPUCommandCache;

    /**
     * 初始化 WebGPU 获取 GPUDevice 。
     */
    async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        this.device = await getGPUDevice(options, descriptor);
        //
        this.device?.lost.then(async (info) =>
        {
            console.error(`WebGPU device was lost: ${info.message}`);

            // 'reason' will be 'destroyed' if we intentionally destroy the device.
            if (info.reason !== "destroyed")
            {
                // try again
                this.device = await getGPUDevice(options, descriptor);
            }
        });

        return this;
    }

    get device()
    {
        return this._device;
    }
    set device(v)
    {
        this._device = v;
        this._runWebGPU = new RunWebGPUCommandCache(this._device);
    }

    public _device: GPUDevice;

    /**
     * 提交 GPU 。
     *
     * @param submit 一次 GPU 提交内容。
     *
     * @see GPUQueue.submit
     */
    submit(submit: Submit)
    {
        this._runWebGPU.runSubmit(submit);
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: TextureLike)
    {
        this._runWebGPU.destoryTexture(texture);
    }

    /**
     * 操作纹理进行Y轴翻转或进行预乘Alpha。
     *
     * @param texture 被操作的纹理。
     * @param invertY 是否Y轴翻转
     * @param premultiplyAlpha 是否预乘Alpha。
     */
    textureInvertYPremultiplyAlpha(texture: TextureLike, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        this._runWebGPU.textureInvertYPremultiplyAlpha(texture, options);
    }

    /**
     * 拷贝 深度纹理到 普通纹理。
     *
     * @param device GPU设备。
     * @param sourceTexture 源纹理。
     * @param targetTexture 目标纹理。
     */
    copyDepthTexture(sourceTexture: TextureLike, targetTexture: TextureLike)
    {
        this._runWebGPU.copyDepthTexture(sourceTexture, targetTexture);
    }

    /**
     * 从 GPU纹理 上读取数据。
     *
     * @param gpuReadPixels
     *
     * @returns 读取到的数据。
     */
    async readPixels(gpuReadPixels: ReadPixels)
    {
        const result = await this._runWebGPU.readPixels(gpuReadPixels);
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
    async readBuffer(buffer: GBuffer, offset?: GPUSize64, size?: GPUSize64)
    {
        const result = await this._runWebGPU.readBuffer(buffer, offset, size);
        return result;
    }

    getGPUTextureSize(input: TextureLike)
    {
        return getTextureSize(input);
    }
}
