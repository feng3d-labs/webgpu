import { anyEmitter } from "@feng3d/event";
import { ISampler } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { IGPUSampler_changed } from "../eventnames";

export function getGPUSampler(device: GPUDevice, sampler: ISampler)
{
    let gSampler = samplerMap.get(sampler);
    if (gSampler) return gSampler;

    // 处理默认值
    sampler.addressModeU = sampler.addressModeU ?? "repeat";
    sampler.addressModeV = sampler.addressModeV ?? "repeat";
    sampler.addressModeW = sampler.addressModeW ?? "repeat";
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
const samplerMap = new WeakMap<ISampler, GPUSampler>();

/**
 * GPU采样器默认值。
 */
const defaultSampler: ISampler = {
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