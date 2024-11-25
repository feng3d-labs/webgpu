import { anyEmitter } from "@feng3d/event";

import { getGPUBuffer } from "./caches/getGPUBuffer";
import { getGPURenderOcclusionQuery } from "./caches/getGPURenderOcclusionQuery";
import { getGPURenderPassDescriptor } from "./caches/getGPURenderPassDescriptor";
import { getGPUTexture } from "./caches/getGPUTexture";
import { IGPUCommandEncoder } from "./data/IGPUCommandEncoder";
import { IGPUComputePass } from "./data/IGPUComputePass";
import { IGPUCopyBufferToBuffer } from "./data/IGPUCopyBufferToBuffer";
import { IGPUCopyTextureToTexture } from "./data/IGPUCopyTextureToTexture";
import { IGPURenderBundleObject } from "./data/IGPURenderBundleObject";
import { IGPURenderObject } from "./data/IGPURenderObject";
import { IGPURenderOcclusionQueryObject } from "./data/IGPURenderOcclusionQueryObject";
import { IGPURenderPass } from "./data/IGPURenderPass";
import { IGPUSubmit } from "./data/IGPUSubmit";
import { GPUQueue_submit } from "./eventnames";
import { getGPURenderPassFormats } from "./runs/getGPURenderPassFormats";
import { runComputeObject } from "./runs/runComputeObject";
import { runRenderBundle } from "./runs/runRenderBundle";
import { runRenderObject } from "./runs/runRenderObject";
import { runRenderOcclusionQueryObject } from "./runs/runRenderOcclusionQueryObject";

export class RunWebGPU
{
    runSubmit(device: GPUDevice, submit: IGPUSubmit)
    {
        const commandBuffers = submit.commandEncoders.map((v) =>
        {
            const commandBuffer = this.runCommandEncoder(device, v);

            return commandBuffer;
        });

        device.queue.submit(commandBuffers);

        // 派发提交WebGPU事件
        anyEmitter.emit(device.queue, GPUQueue_submit);
    }

    runCommandEncoder(device: GPUDevice, commandEncoder: IGPUCommandEncoder)
    {
        const gpuCommandEncoder = device.createCommandEncoder();

        commandEncoder.passEncoders.forEach((passEncoder) =>
        {
            if ((passEncoder as IGPURenderPass).descriptor)
            {
                this.runRenderPass(device, gpuCommandEncoder, passEncoder as IGPURenderPass);
            }
            else if ((passEncoder as IGPUComputePass).computeObjects)
            {
                this.runComputePass(device, gpuCommandEncoder, passEncoder as IGPUComputePass);
            }
            else if ((passEncoder as IGPUCopyTextureToTexture).source?.texture)
            {
                this.runCopyTextureToTexture(device, gpuCommandEncoder, passEncoder as IGPUCopyTextureToTexture);
            }
            else if ((passEncoder as IGPUCopyBufferToBuffer).source)
            {
                this.runCopyBufferToBuffer(device, gpuCommandEncoder, passEncoder as IGPUCopyBufferToBuffer);
            }
            else
            {
                console.error(`未处理 passEncoder`);
            }
        });

        return gpuCommandEncoder.finish();
    }

    runRenderPass(device: GPUDevice, commandEncoder: GPUCommandEncoder, renderPass: IGPURenderPass)
    {
        const renderPassDescriptor = getGPURenderPassDescriptor(device, renderPass.descriptor);
        const renderPassFormats = getGPURenderPassFormats(renderPass.descriptor);

        // 处理不被遮挡查询。
        const occlusionQuery = getGPURenderOcclusionQuery(renderPass.renderObjects);
        occlusionQuery?.init(device, renderPassDescriptor)

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

        //
        renderPass.renderObjects?.forEach((element) =>
        {
            if ((element as IGPURenderOcclusionQueryObject).type === "OcclusionQueryObject")
            {
                runRenderOcclusionQueryObject(device, passEncoder, renderPassFormats, element as IGPURenderOcclusionQueryObject);
            }
            else if ((element as IGPURenderBundleObject).renderObjects)
            {
                runRenderBundle(device, passEncoder, renderPassFormats, element as IGPURenderBundleObject);
            }
            else
            {
                runRenderObject(device, passEncoder, renderPassFormats, element as IGPURenderObject);
            }
        });

        passEncoder.end();

        //
        occlusionQuery?.queryResult(device, commandEncoder, renderPass);
    }

    /**
     * 执行计算通道。
     *
     * @param device GPU设备。
     * @param commandEncoder 命令编码器。
     * @param computePass 计算通道。
     */
    runComputePass(device: GPUDevice, commandEncoder: GPUCommandEncoder, computePass: IGPUComputePass)
    {
        const passEncoder = commandEncoder.beginComputePass(computePass.descriptor);

        computePass.computeObjects.forEach((computeObject) =>
        {
            runComputeObject(device, passEncoder, computeObject);
        });

        passEncoder.end();
    }

    runCopyTextureToTexture(device: GPUDevice, commandEncoder: GPUCommandEncoder, copyTextureToTexture: IGPUCopyTextureToTexture)
    {
        const sourceTexture = getGPUTexture(device, copyTextureToTexture.source.texture);
        const destinationTexture = getGPUTexture(device, copyTextureToTexture.destination.texture);

        const source: GPUImageCopyTexture = {
            ...copyTextureToTexture.source,
            texture: sourceTexture,
        };

        const destination: GPUImageCopyTexture = {
            ...copyTextureToTexture.destination,
            texture: destinationTexture,
        };

        commandEncoder.copyTextureToTexture(
            source,
            destination,
            copyTextureToTexture.copySize,
        );
    }

    runCopyBufferToBuffer(device: GPUDevice, commandEncoder: GPUCommandEncoder, v: IGPUCopyBufferToBuffer)
    {
        v.sourceOffset ||= 0;
        v.destinationOffset ||= 0;
        v.size ||= v.source.size;

        //
        const sourceBuffer = getGPUBuffer(device, v.source);
        const destinationBuffer = getGPUBuffer(device, v.destination);

        commandEncoder.copyBufferToBuffer(
            sourceBuffer,
            v.sourceOffset,
            destinationBuffer,
            v.destinationOffset,
            v.size,
        );
    }
}
