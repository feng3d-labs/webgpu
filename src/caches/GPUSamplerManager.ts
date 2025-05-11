import { computed, Computed, reactive } from "@feng3d/reactivity";
import { ChainMap, Sampler } from "@feng3d/render-api";

export class GPUSamplerManager
{
    /**
     * 从设备以及采样器描述获得GPU采样器。
     *
     * @param device 设备。
     * @param sampler 采样器描述。
     * @returns GPU采样器。
     */
    static getGPUSampler(device: GPUDevice, sampler: Sampler)
    {
        const getGPUSamplerKey: GetGPUSamplerKey = [device, sampler];
        let result = this.getGPUSamplerMap.get(getGPUSamplerKey);
        if (result) return result.value;

        result = computed(() =>
        {
            // 监听
            const r_sampler = reactive(sampler);
            const {
                label,
                addressModeU,
                addressModeV,
                addressModeW,
                magFilter,
                minFilter,
                mipmapFilter,
                lodMinClamp,
                lodMaxClamp,
                compare,
                maxAnisotropy,
            } = r_sampler;

            const gSampler = device.createSampler({
                label,
                addressModeU: addressModeU ?? "repeat",
                addressModeV: addressModeV ?? "repeat",
                addressModeW: addressModeW ?? "repeat",
                magFilter: magFilter ?? "nearest",
                minFilter: minFilter ?? "nearest",
                mipmapFilter: mipmapFilter ?? "nearest",
                lodMinClamp: lodMinClamp ?? 0,
                lodMaxClamp,
                compare,
                maxAnisotropy: (minFilter === "linear" && magFilter === "linear" && mipmapFilter === "linear") ? maxAnisotropy : 1,
            });

            return gSampler;
        });
        this.getGPUSamplerMap.set(getGPUSamplerKey, result);

        return result.value;
    }

    private static readonly getGPUSamplerMap = new ChainMap<GetGPUSamplerKey, Computed<GPUSampler>>();

    /**
     * GPU采样器默认值。
     */
    private static readonly defaultSampler: Sampler = {
        addressModeU: undefined,
        addressModeV: undefined,
        addressModeW: undefined,
        magFilter: undefined,
        minFilter: undefined,
        mipmapFilter: undefined,
        lodMinClamp: undefined,
        lodMaxClamp: undefined,
        compare: undefined,
        maxAnisotropy: undefined,
    };
}

type GetGPUSamplerKey = [device: GPUDevice, sampler: Sampler];
