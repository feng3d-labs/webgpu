import { getIGPUSubmit } from "./caches/getIGPUSubmit";
import { getGPUTextureSize } from "./caches/getIGPUTexture";
import { IGPUComputeObject } from "./data/IGPUComputeObject";
import { IGPUComputePassEncoder } from "./data/IGPUComputePassEncoder";
import { IGPUCopyBufferToBuffer } from "./data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./data/IGPUCopyTextureToTexture";
import { IGPURenderObject } from "./data/IGPURenderObject";
import { IGPURenderPassDescriptor, IGPURenderPassEncoder } from "./data/IGPURenderPassEncoder";
import { IGPUSubmit } from "./data/IGPUSubmit";
import { IGPUTexture, IGPUTextureBase } from "./data/IGPUTexture";
import { WebGPU as WebGPUBase } from "./webgpu-data-driven/WebGPU";

export class WebGPU
{
    static async init(options?: GPURequestAdapterOptions, descriptor?: GPUDeviceDescriptor)
    {
        const webGPUBase = await WebGPUBase.init(options, descriptor);

        const webGPU = new WebGPU(webGPUBase);

        return webGPU;
    }

    private _webgpu: WebGPUBase;

    constructor(webGPUBase: WebGPUBase)
    {
        this._webgpu = webGPUBase;
    }

    /**
     * 提交 GPU 。
     *
     * @param data 一次 GPU 提交内容。
     */
    submit(data: IGPUSubmit)
    {
        const gpuSubmit = getIGPUSubmit(this._webgpu.device, data);

        this._webgpu.submit(gpuSubmit);
    }

    /**
     * 操作纹理进行Y轴翻转或进行预乘Alpha。
     *
     * @param texture 被操作的纹理。
     * @param invertY 是否Y轴翻转
     * @param premultiplyAlpha 是否预乘Alpha。
     */
    textureInvertYPremultiplyAlpha(texture: IGPUTextureBase, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        this._webgpu.textureInvertYPremultiplyAlpha(texture, options);
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
        const result = await this._webgpu.readPixels(params);

        return result;
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
        this._webgpu.copyDepthTexture(sourceTexture, targetTexture);
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: IGPUTexture)
    {
        this._webgpu.destoryTexture(texture);
    }

    getIGPUTextureSize(input: IGPUTexture)
    {
        return getGPUTextureSize(this._webgpu.device, input);
    }
}
