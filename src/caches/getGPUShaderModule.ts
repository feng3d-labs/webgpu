import { ChainMap } from "@feng3d/render-api";

export function getGPUShaderModule(device: GPUDevice, code: string)
{
    const getGPUShaderModuleKey: GetGPUShaderModuleKey = [device, code];
    let gShaderModule = getGPUShaderModuleMap.get(getGPUShaderModuleKey);
    if (gShaderModule) return gShaderModule;

    gShaderModule = device.createShaderModule({
        code,
    });
    getGPUShaderModuleMap.set(getGPUShaderModuleKey, gShaderModule);

    return gShaderModule;
}
type GetGPUShaderModuleKey = [device: GPUDevice, code: string];
const getGPUShaderModuleMap = new ChainMap<GetGPUShaderModuleKey, GPUShaderModule>;