import { reactive } from '@feng3d/reactivity';
import { MultisampleState } from '../data/MultisampleState';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUMultisampleState extends ReactiveObject
{
    readonly gpuMultisampleState: GPUMultisampleState;

    constructor(multisampleState: MultisampleState)
    {
        super();

        this._createGPUMultisampleState(multisampleState);
        this._onMap(multisampleState);
    }

    private _createGPUMultisampleState(multisampleState: MultisampleState)
    {
        if (!multisampleState)
        {
            reactive(this).gpuMultisampleState = WGPUMultisampleState.defaultGPUMultisampleState;

            return;
        }
        const r_multisampleState = reactive(multisampleState);

        this.effect(() =>
        {
            // 监听
            r_multisampleState.mask;
            r_multisampleState.alphaToCoverageEnabled;

            // 计算
            const { mask, alphaToCoverageEnabled } = multisampleState;
            const gpuMultisampleState: GPUMultisampleState = {
                count: 4,
                mask: mask ?? 0xFFFFFFFF,
                alphaToCoverageEnabled: alphaToCoverageEnabled ?? false,
            };

            reactive(this).gpuMultisampleState = gpuMultisampleState;
        });
    }

    private _onMap(multisampleState: MultisampleState)
    {
        WGPUMultisampleState.cacheMap.set(multisampleState, this);
        this.destroyCall(() => { WGPUMultisampleState.cacheMap.delete(multisampleState); });
    }

    static getInstance(multisampleState: MultisampleState)
    {
        return this.cacheMap.get(multisampleState) || new WGPUMultisampleState(multisampleState);
    }

    static readonly cacheMap = new Map<MultisampleState, WGPUMultisampleState>();
    static readonly defaultGPUMultisampleState: GPUMultisampleState = { count: 4, mask: 0xFFFFFFFF, alphaToCoverageEnabled: false };
}

declare global
{
    interface GPUDevice
    {
        multisampleStates: WeakMap<MultisampleState, WGPUMultisampleState>;
    }
}