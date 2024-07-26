import { IGPUSubmit } from "../data/IGPUSubmit";
import { getIGPUCommandEncoder } from "./getIGPUCommandEncoder";

export function getIGPUSubmit(device: GPUDevice, data: IGPUSubmit)
{
    const commandEncoders = data.commandEncoders.map((v) => getIGPUCommandEncoder(device, v));

    const gpuSubmit: IGPUSubmit = {
        commandEncoders,
    };

    return gpuSubmit;
}
