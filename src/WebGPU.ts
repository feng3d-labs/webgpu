import { GBuffer, ReadPixels, Submit, TextureLike } from "@feng3d/render-api";
import { getGPUBuffer } from "./caches/getGPUBuffer";
import { getGPUTexture } from "./caches/getGPUTexture";
import { getTextureSize } from "./caches/getTextureSize";
import "./data/polyfills/ReadPixels";
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
export class WebGPU extends RunWebGPUCommandCache
{
    /**
     * 提交 GPU 。
     *
     * @param submit 一次 GPU 提交内容。
     *
     * @see GPUQueue.submit
     */
    submit(submit: Submit)
    {
        this.runSubmit(this.device, submit);
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: TextureLike)
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
    textureInvertYPremultiplyAlpha(texture: TextureLike, options: { invertY?: boolean, premultiplyAlpha?: boolean })
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
    copyDepthTexture(sourceTexture: TextureLike, targetTexture: TextureLike)
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
    async readPixels(gpuReadPixels: ReadPixels)
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
    async readBuffer(buffer: GBuffer, offset?: GPUSize64, size?: GPUSize64)
    {
        const gpuBuffer = getGPUBuffer(this.device, buffer);
        await gpuBuffer.mapAsync(GPUMapMode.READ);

        const result = gpuBuffer.getMappedRange(offset, size).slice(0);

        gpuBuffer.unmap();

        return result;
    }

    getGPUTextureSize(input: TextureLike)
    {
        return getTextureSize(input);
    }
}
