import { IGPUSubmit } from "../data/IGPUSubmit";
import { ISubmit } from "../data/ISubmit";
import { getIGPUCommandEncoder } from "./getIGPUCommandEncoder";

export function getIGPUSubmit(device: GPUDevice, data: ISubmit)
{
    const commandEncoders = data.commandEncoders.map((v) => getIGPUCommandEncoder(device, v));

    const gpuSubmit: IGPUSubmit = {
        commandEncoders,
    };

    return gpuSubmit;
}
