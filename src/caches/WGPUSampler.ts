import { reactive } from '@feng3d/reactivity';
import { Sampler } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUSampler extends ReactiveObject
{
    readonly gpuSampler: GPUSampler;

    constructor(device: GPUDevice, sampler: Sampler)
    {
        super();

        this._createGPUSampler(device, sampler);

        this._onMap(device, sampler);
    }

    private _createGPUSampler(device: GPUDevice, sampler: Sampler)
    {
        const r_this = reactive(this);
        const r_sampler = reactive(sampler);

        this.effect(() =>
        {
            const r_defaultSampler = reactive(WGPUSampler).defaultSampler;

            //
            const label = r_sampler.label;
            const addressModeU = r_sampler.addressModeU ?? r_defaultSampler.addressModeU;
            const addressModeV = r_sampler.addressModeV ?? r_defaultSampler.addressModeV;
            const addressModeW = r_sampler.addressModeW ?? r_defaultSampler.addressModeW;
            const magFilter = r_sampler.magFilter ?? r_defaultSampler.magFilter;
            const minFilter = r_sampler.minFilter ?? r_defaultSampler.minFilter;
            const mipmapFilter = r_sampler.mipmapFilter ?? r_defaultSampler.mipmapFilter;
            const lodMinClamp = r_sampler.lodMinClamp ?? r_defaultSampler.lodMinClamp;
            const lodMaxClamp = r_sampler.lodMaxClamp ?? r_defaultSampler.lodMaxClamp;
            const compare = r_sampler.compare ?? r_defaultSampler.compare;
            const maxAnisotropy = (minFilter === 'linear' && magFilter === 'linear' && mipmapFilter === 'linear') ? r_sampler.maxAnisotropy : r_defaultSampler.maxAnisotropy;

            //
            const gSampler = device.createSampler({
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
            });

            //
            r_this.gpuSampler = gSampler;
        });

        this.destroyCall(() => { r_this.gpuSampler = null; });
    }

    private _onMap(device: GPUDevice, sampler: Sampler)
    {
        device.samplers ??= new WeakMap<Sampler, WGPUSampler>();
        device.samplers.set(sampler, this);
        this.destroyCall(() => { device.samplers.delete(sampler); });
    }

    /**
     * 从设备以及采样器描述获得GPU采样器。
     *
     * @param device 设备。
     * @param sampler 采样器描述。
     * @returns GPU采样器。
     */
    static getInstance(device: GPUDevice, sampler: Sampler)
    {
        return device.samplers?.get(sampler) || new WGPUSampler(device, sampler);
    }

    /**
     * GPU采样器默认值。
     */
    static readonly defaultSampler: Sampler = {
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "repeat",
        magFilter: "nearest",
        minFilter: "nearest",
        mipmapFilter: "nearest",
        lodMinClamp: 0,
        lodMaxClamp: 16,
        compare: undefined,
        maxAnisotropy: 1,
    };
}

declare global
{
    interface GPUDevice
    {
        samplers: WeakMap<Sampler, WGPUSampler>;
    }
}