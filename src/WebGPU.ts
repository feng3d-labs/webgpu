import { getIGPUSubmit } from "./caches/getIGPUSubmit";
import { getGPUTextureSize } from "./caches/getIGPUTexture";
import { ICopyTextureToTexture } from "./data/ICopyTextureToTexture";
import { IGPUComputeObject } from "./data/IGPUComputeObject";
import { IGPUComputePassEncoder } from "./data/IGPUComputePassEncoder";
import { IGPUCopyBufferToBuffer } from "./data/IGPUCopyBufferToBuffer";
import { IGPUSubmit } from "./data/IGPUSubmit";
import { IGPUTexture, IGPUTextureBase } from "./data/IGPUTexture";
import { IRenderObject } from "./data/IRenderObject";
import { IRenderPass } from "./data/IRenderPass";
import { IRenderPassEncoder } from "./data/IRenderPassEncoder";
import { ISubmit } from "./data/ISubmit";
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
    private _currentSubmit: ISubmit;
    private _currentRenderPassEncoder: IRenderPassEncoder;
    private _currentComputePassEncoder: IGPUComputePassEncoder;

    constructor(webGPUBase: WebGPUBase)
    {
        this._webgpu = webGPUBase;
    }

    renderPass(renderPass: IRenderPass)
    {
        this._currentSubmit = this._currentSubmit || { commandEncoders: [{ passEncoders: [] }] };
        //
        if (this._currentRenderPassEncoder?.renderPass === renderPass) return;
        //
        this._currentRenderPassEncoder = { renderPass, renderObjects: [] };
        this._currentComputePassEncoder = null;
        this._currentSubmit.commandEncoders[0].passEncoders.push(this._currentRenderPassEncoder);
    }

    renderObject(renderObject: IRenderObject)
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

    copyTextureToTexture(copyTextureToTexture: ICopyTextureToTexture)
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
     * @param data 一次 GPU 提交内容。
     */
    submit(data?: ISubmit)
    {
        let gpuSubmit: IGPUSubmit;
        if (data)
        {
            gpuSubmit = getIGPUSubmit(this._webgpu.device, data);
        }
        else
        {
            if (!this._currentSubmit) return;
            gpuSubmit = getIGPUSubmit(this._webgpu.device, this._currentSubmit);
            this._currentSubmit = null;
            this._currentRenderPassEncoder = null;
            this._currentComputePassEncoder = null;
        }

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
        const gTexture = texture;

        this._webgpu.textureInvertYPremultiplyAlpha(gTexture, options);
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
        const gTexture = params.texture;
        const result = await this._webgpu.readPixels({
            ...params,
            texture: gTexture,
        });

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
        const gSourceTexture = sourceTexture;
        const gTargetTexture = targetTexture;

        this._webgpu.copyDepthTexture(gSourceTexture, gTargetTexture);
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: IGPUTexture)
    {
        const gTexture = texture;
        this._webgpu.destoryTexture(gTexture);
    }

    getIGPUTextureSize(input: IGPUTexture)
    {
        return getGPUTextureSize(this._webgpu.device, input);
    }
}
