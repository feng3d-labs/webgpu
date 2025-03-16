export function getGPUShaderModule(device: GPUDevice, code: string)
{
    let gShaderModule = device._shaderMap.get(code);
    if (gShaderModule) return gShaderModule;

    gShaderModule = device.createShaderModule({
        code,
    });
    device._shaderMap.set(code, gShaderModule);

    return gShaderModule;
}
