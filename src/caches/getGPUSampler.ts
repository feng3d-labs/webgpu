import { watcher } from "@feng3d/watcher";
import { IGPUSampler } from "../data/IGPUSampler";

/**
 * GPU采样器默认值。
 */
export const defaultSampler: IGPUSampler = {
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

export function getGPUSampler(device: GPUDevice, sampler: IGPUSampler)
{
    let gSampler = samplerMap.get(sampler);
    if (gSampler) return gSampler;

    gSampler = device.createSampler(sampler);
    samplerMap.set(sampler, gSampler);

    //
    watcher.watchobject(sampler, defaultSampler, () =>
    {
        // 移除监听，删除缓存
        watcher.unwatchobject(sampler, defaultSampler);
        samplerMap.delete(sampler);
    });

    return gSampler;
}
const samplerMap = new WeakMap<IGPUSampler, GPUSampler>();
