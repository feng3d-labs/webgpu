import { IGPUSubmit, WebGPU as WebGPUBase } from 'webgpu-data-driven';
import { getIGPUSubmit } from './caches/getIGPUSubmit';
import { IComputeObject } from './data/IComputeObject';
import { IComputePassEncoder } from './data/IComputePassEncoder';
import { ICopyBufferToBuffer } from './data/ICopyBufferToBuffer';
import { ICopyTextureToTexture } from './data/ICopyTextureToTexture';
import { IRenderObject } from './data/IRenderObject';
import { IRenderPass } from './data/IRenderPass';
import { IRenderPassEncoder } from './data/IRenderPassEncoder';
import { ISubmit } from './data/ISubmit';
import { ITexture, ITextureBase } from './data/ITexture';
import { getIGPUTexture } from './internal';

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
    private _currentComputePassEncoder: IComputePassEncoder;

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

    computeObject(computeObject: IComputeObject)
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

    copyBufferToBuffer(copyBufferToBuffer: ICopyBufferToBuffer)
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
            gpuSubmit = getIGPUSubmit(data);
        }
        else
        {
            if (!this._currentSubmit) return;
            gpuSubmit = getIGPUSubmit(this._currentSubmit);
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
    textureInvertYPremultiplyAlpha(texture: ITextureBase, options: { invertY?: boolean, premultiplyAlpha?: boolean })
    {
        const gTexture = getIGPUTexture(texture);

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
    async readPixels(params: { texture: ITexture, origin: GPUOrigin3D, copySize: { width: number, height: number } })
    {
        const gTexture = getIGPUTexture(params.texture);
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
    copyDepthTexture(sourceTexture: ITexture, targetTexture: ITexture)
    {
        const gSourceTexture = getIGPUTexture(sourceTexture);
        const gTargetTexture = getIGPUTexture(targetTexture);

        this._webgpu.copyDepthTexture(gSourceTexture, gTargetTexture);
    }

    /**
     * 销毁纹理。
     *
     * @param texture 需要被销毁的纹理。
     */
    destoryTexture(texture: ITexture)
    {
        const gTexture = getIGPUTexture(texture);
        this._webgpu.destoryTexture(gTexture);
    }
}
