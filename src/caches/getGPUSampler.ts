import { anyEmitter } from "@feng3d/event";
import { ChainMap, Sampler } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { IGPUSampler_changed } from "../eventnames";

export function getGPUSampler(device: GPUDevice, sampler: Sampler)
{
    const getGPUSamplerKey: GetGPUSamplerKey = [device, sampler];
    let gSampler = getGPUSamplerMap.get(getGPUSamplerKey);
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
    getGPUSamplerMap.set(getGPUSamplerKey, gSampler);

    //
    watcher.watchobject(sampler, defaultSampler, () =>
    {
        // 移除监听，删除缓存
        watcher.unwatchobject(sampler, defaultSampler);
        getGPUSamplerMap.delete(getGPUSamplerKey);
        //
        anyEmitter.emit(sampler, IGPUSampler_changed);
    });

    return gSampler;
}
type GetGPUSamplerKey = [device: GPUDevice, sampler: Sampler];
const getGPUSamplerMap = new ChainMap<GetGPUSamplerKey, GPUSampler>;

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