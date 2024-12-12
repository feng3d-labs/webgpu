import { IGPUComputeObject } from "./data/IGPUComputeObject";
import { IGPUComputePass } from "./data/IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "./data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./data/IGPUCopyTextureToTexture";
import { IRenderObject } from "./data/IGPURenderObject";
import { IRenderPass, IRenderPassObject } from "./data/IGPURenderPass";
import { IRenderPassDescriptor } from "./data/IGPURenderPassDescriptor";
import { ISubmit } from "./data/IGPUSubmit";
import { WebGPU } from "./WebGPU";

/**
 * 按步骤来组织 IGPUSubmit 对象。
 *
 * 不建议使用。
 */
export class WebGPUStep
{
    private _currentSubmit: ISubmit;
    private _currentRenderPassEncoder: IRenderPass;
    private _currentComputePassEncoder: IGPUComputePass;

    readonly webGPU: WebGPU;

    constructor(webGPU: WebGPU)
    {
        this.webGPU = webGPU;
    }

    renderPass(descriptor: IRenderPassDescriptor)
    {
        this._currentSubmit = this._currentSubmit || { commandEncoders: [{ passEncoders: [] }] };
        //
        if (this._currentRenderPassEncoder?.descriptor === descriptor) return;
        //
        this._currentRenderPassEncoder = { descriptor, renderObjects: [] };
        this._currentComputePassEncoder = null;
        this._currentSubmit.commandEncoders[0].passEncoders.push(this._currentRenderPassEncoder);
    }

    renderObject(renderObject: IRenderObject)
    {
        (this._currentRenderPassEncoder.renderObjects as IRenderPassObject[]).push(renderObject);
    }

    computePass()
    {
        this._currentSubmit = this._currentSubmit || { commandEncoders: [{ passEncoders: [] }] };
        //
        this._currentRenderPassEncoder = null;
        this._currentComputePassEncoder = { __type: "ComputePass", computeObjects: [] };
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
    submit(submit?: ISubmit)
    {
        if (!submit)
        {
            if (!this._currentSubmit) return;
            submit = this._currentSubmit;
            this._currentSubmit = null;
            this._currentRenderPassEncoder = null;
            this._currentComputePassEncoder = null;
        }

        this.webGPU.submit(submit);
    }
}
