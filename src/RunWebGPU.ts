import { anyEmitter } from "@feng3d/event";

import { IGPUSubmit } from "./data/IGPUSubmit";
import { GPUQueue_submit } from "./eventnames";
import { runCommandEncoder } from "./runs/runCommandEncoder";

export class RunWebGPU
{
    runSubmit(device: GPUDevice, submit: IGPUSubmit)
    {
        const commandBuffers = submit.commandEncoders.map((v) =>
        {
            const commandBuffer = runCommandEncoder(device, v);

            return commandBuffer;
        });

        device.queue.submit(commandBuffers);

        // 派发提交WebGPU事件
        anyEmitter.emit(device.queue, GPUQueue_submit);
    }
}
