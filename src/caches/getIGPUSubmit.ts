import { IGPUSubmit } from "../data/IGPUSubmit";
import { ISubmit } from "../data/ISubmit";
import { getIGPUCommandEncoder } from "./getIGPUCommandEncoder";

export function getIGPUSubmit(data: ISubmit)
{
    const commandEncoders = data.commandEncoders.map((v) => getIGPUCommandEncoder(v));

    const gpuSubmit: IGPUSubmit = {
        commandEncoders,
    };

    return gpuSubmit;
}
