import { computed, Computed, reactive } from '@feng3d/reactivity';
import { ChainMap, Sampler } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUSampler extends ReactiveObject
{
    get gpuSampler() { return this._computedGpuSampler.value; }
    private _computedGpuSampler: Computed<GPUSampler>;

    constructor(device: GPUDevice, sampler: Sampler)
    {
        super();

        this._onCreate(device, sampler);

        //
        WGPUSampler.map.set([device, sampler], this);
        this.destroyCall(() => { WGPUSampler.map.delete([device, sampler]); });
    }

    private _onCreate(device: GPUDevice, sampler: Sampler)
    {
        const r_sampler = reactive(sampler);

        this._computedGpuSampler = computed(() =>
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
            const gpuSampler = device.createSampler({
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
            return gpuSampler;
        });
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
        return this.map.get([device, sampler]) || new WGPUSampler(device, sampler);
    }
    private static readonly map = new ChainMap<[GPUDevice, Sampler], WGPUSampler>();

    /**
     * GPU采样器默认值。
     */
    static readonly defaultSampler: Sampler = {
        addressModeU: 'repeat',
        addressModeV: 'repeat',
        addressModeW: 'repeat',
        magFilter: 'nearest',
        minFilter: 'nearest',
        mipmapFilter: 'nearest',
        lodMinClamp: 0,
        lodMaxClamp: 16,
        compare: undefined,
        maxAnisotropy: 1,
    };
}