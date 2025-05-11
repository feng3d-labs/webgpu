import { ChainMap } from "@feng3d/render-api";

/**
 * GPU着色器模块管理器。
 */
export class GPUShaderModuleManager
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
        const getGPUShaderModuleKey: GetGPUShaderModuleKey = [device, code];
        let gShaderModule = this.getGPUShaderModuleMap.get(getGPUShaderModuleKey);
        if (gShaderModule) return gShaderModule;

        gShaderModule = device.createShaderModule({
            code,
        });
        this.getGPUShaderModuleMap.set(getGPUShaderModuleKey, gShaderModule);

        return gShaderModule;
    }

    private static readonly getGPUShaderModuleMap = new ChainMap<GetGPUShaderModuleKey, GPUShaderModule>();
}
type GetGPUShaderModuleKey = [device: GPUDevice, code: string];