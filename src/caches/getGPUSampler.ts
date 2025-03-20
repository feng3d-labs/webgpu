import { ChainMap, computed, ComputedRef, reactive, Sampler } from "@feng3d/render-api";

export function getGPUSampler(device: GPUDevice, sampler: Sampler)
{
    const getGPUSamplerKey: GetGPUSamplerKey = [device, sampler];
    let result = getGPUSamplerMap.get(getGPUSamplerKey);
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
            label: label,
            addressModeU: addressModeU ?? "repeat",
            addressModeV: addressModeV ?? "repeat",
            addressModeW: addressModeW ?? "repeat",
            magFilter: magFilter ?? "nearest",
            minFilter: minFilter ?? "nearest",
            mipmapFilter: mipmapFilter ?? "nearest",
            lodMinClamp: lodMinClamp ?? 0,
            lodMaxClamp: lodMaxClamp,
            compare: compare,
            maxAnisotropy: (minFilter === "linear" && magFilter === "linear" && mipmapFilter === "linear") ? maxAnisotropy : 1,
        });

        return gSampler;
    });
    getGPUSamplerMap.set(getGPUSamplerKey, result);

    return result.value;
}
type GetGPUSamplerKey = [device: GPUDevice, sampler: Sampler];
const getGPUSamplerMap = new ChainMap<GetGPUSamplerKey, ComputedRef<GPUSampler>>;

/**
 * GPU采样器默认值。
 */
const defaultSampler: Sampler = {
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