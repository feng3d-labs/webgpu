import { IGPUComputeObject } from "./data/IGPUComputeObject";
import { IGPUComputePass } from "./data/IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "./data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./data/IGPUCopyTextureToTexture";
import { IGPURenderObject } from "./data/IGPURenderObject";
import { IGPURenderPass, IGPURenderPassObject } from "./data/IGPURenderPass";
import { IGPURenderPassDescriptor } from "./data/IGPURenderPassDescriptor";
import { IGPUSubmit } from "./data/IGPUSubmit";
import { WebGPU } from "./WebGPU";

/**
 * 按步骤来组织 IGPUSubmit 对象。
 *
 * 不建议使用。
 */
export class WebGPUStep
{
    private _currentSubmit: IGPUSubmit;
    private _currentRenderPassEncoder: IGPURenderPass;
    private _currentComputePassEncoder: IGPUComputePass;

    readonly webGPU: WebGPU;

    constructor(webGPU: WebGPU)
    {
        this.webGPU = webGPU;
    }

    renderPass(descriptor: IGPURenderPassDescriptor)
    {
        this._currentSubmit = this._currentSubmit || { commandEncoders: [{ passEncoders: [] }] };
        //
        if (this._currentRenderPassEncoder?.descriptor === descriptor) return;
        //
        this._currentRenderPassEncoder = { descriptor, renderObjects: [] };
        this._currentComputePassEncoder = null;
        this._currentSubmit.commandEncoders[0].passEncoders.push(this._currentRenderPassEncoder);
    }

    renderObject(renderObject: IGPURenderObject)
    {
        (this._currentRenderPassEncoder.renderObjects as IGPURenderPassObject[]).push(renderObject);
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
    submit(submit?: IGPUSubmit)
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
