import { ISubmit } from "../data/ISubmit";
import { IGPUSubmit } from "../webgpu-data-driven/data/IGPUSubmit";
import { getIGPUCommandEncoder } from "./getIGPUCommandEncoder";

export function getIGPUSubmit(data: ISubmit)
{
    const commandEncoders = data.commandEncoders.map((v) => getIGPUCommandEncoder(v));

    const gpuSubmit: IGPUSubmit = {
        commandEncoders,
    };

    return gpuSubmit;
}
