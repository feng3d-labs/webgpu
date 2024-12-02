export function getGPUShaderModule(device: GPUDevice, code: string)
{
    let gShaderModule = shaderMap.get(code);
    if (gShaderModule) return gShaderModule;

    gShaderModule = device.createShaderModule({
        code,
    });
    shaderMap.set(code, gShaderModule);

    return gShaderModule;
}

const shaderMap = new Map<string, GPUShaderModule>();
