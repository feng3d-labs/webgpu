
/**
 * GPU着色器模块管理器。
 */
export class WGPUShaderModule
{
    /**
     * 从设备以及着色器代码获得GPU着色器模块。
     *
     * @param device 设备。
     * @param code 着色器代码。
     * @returns GPU着色器模块。
     */
    static getGPUShaderModule(device: GPUDevice, code: string)
    {
        if (device.shaderModules?.[code]) return device.shaderModules[code];

        device.shaderModules ??= {};

        const gpuShaderModule = device.createShaderModule({ code });
        device.shaderModules[code] = gpuShaderModule;

        gpuShaderModule.getCompilationInfo().then((compilationInfo) => {
            compilationInfo.messages.forEach((message) => {
                console.log(message);
            });
        });

        return gpuShaderModule;
    }
}

declare global
{
    interface GPUDevice
    {
        shaderModules: { [code: string]: GPUShaderModule };
    }
}
