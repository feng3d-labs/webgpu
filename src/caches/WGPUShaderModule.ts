/**
 * GPU着色器模块管理器
 *
 * 负责管理GPU着色器模块的创建和缓存，避免重复编译相同的着色器代码。
 */
export class WGPUShaderModule
{
    /**
     * 从设备以及着色器代码获得GPU着色器模块
     *
     * @param device GPU设备实例
     * @param code 着色器代码
     * @returns GPU着色器模块
     */
    static getGPUShaderModule(device: GPUDevice, code: string)
    {
        if (device.shaderModules?.[code]) return device.shaderModules[code];

        device.shaderModules ??= {};

        const gpuShaderModule = device.createShaderModule({ code });
        device.shaderModules[code] = gpuShaderModule;

        // 异步获取编译信息，用于调试
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
        /** 着色器模块缓存映射表 */
        shaderModules: { [code: string]: GPUShaderModule };
    }
}
