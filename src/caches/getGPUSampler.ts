import { anyEmitter } from "@feng3d/event";
import { watcher } from "@feng3d/watcher";
import { IGPUSampler } from "../data/IGPUSampler";
import { IGPUSampler_changed } from "../eventnames";

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

    // 处理默认值
    sampler.addressModeU = sampler.addressModeU ?? "clamp-to-edge";
    sampler.addressModeV = sampler.addressModeV ?? "clamp-to-edge";
    sampler.addressModeW = sampler.addressModeW ?? "clamp-to-edge";
    sampler.magFilter = sampler.magFilter ?? "nearest";
    sampler.minFilter = sampler.minFilter ?? "nearest";
    sampler.mipmapFilter = sampler.mipmapFilter ?? "nearest";

    //
    gSampler = device.createSampler(sampler);
    samplerMap.set(sampler, gSampler);

    //
    watcher.watchobject(sampler, defaultSampler, () =>
    {
        // 移除监听，删除缓存
        watcher.unwatchobject(sampler, defaultSampler);
        samplerMap.delete(sampler);
        //
        anyEmitter.emit(sampler, IGPUSampler_changed);
    });

    return gSampler;
}
const samplerMap = new WeakMap<IGPUSampler, GPUSampler>();
