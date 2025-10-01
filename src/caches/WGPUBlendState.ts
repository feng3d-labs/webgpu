import { reactive } from '@feng3d/reactivity';
import { BlendComponent, BlendState } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUBlendState extends ReactiveObject
{
    readonly gpuBlendState: GPUBlendState;

    constructor(blendState: BlendState)
    {
        super();

        this._createGPUBlendState(blendState);
        this._onMap(blendState);
    }

    private _createGPUBlendState(blendState: BlendState)
    {
        const r_this = reactive(this);
        const r_blend = reactive(blendState);
        this.effect(() =>
        {
            const color = WGPUBlendState.getGPUBlendComponent(r_blend.color);
            const alpha = WGPUBlendState.getGPUBlendComponent(r_blend.alpha);

            // 计算
            const gpuBlend: GPUBlendState = {
                color: color,
                alpha: alpha,
            };

            r_this.gpuBlendState = gpuBlend;
        });
    }

    private static getGPUBlendComponent(blendComponent?: BlendComponent): GPUBlendComponent
    {
        if (!blendComponent) return { operation: 'add', srcFactor: 'one', dstFactor: 'zero' };

        // 计算
        const { operation, srcFactor, dstFactor } = blendComponent;
        // 当 operation 为 max 或 min 时，srcFactor 和 dstFactor 必须为 one。
        const gpuBlendComponent: GPUBlendComponent = {
            operation: operation ?? 'add',
            srcFactor: (operation === 'max' || operation === 'min') ? 'one' : (srcFactor ?? 'one'),
            dstFactor: (operation === 'max' || operation === 'min') ? 'one' : (dstFactor ?? 'zero'),
        };

        return gpuBlendComponent;
    }

    private _onMap(blendState: BlendState)
    {
        WGPUBlendState.cacheMap.set(blendState, this);
        this.destroyCall(() => { WGPUBlendState.cacheMap.delete(blendState); });
    }

    static getInstance(blendState: BlendState)
    {
        if (!blendState) return undefined;

        return this.cacheMap.get(blendState) || new WGPUBlendState(blendState);
    }

    static readonly cacheMap = new WeakMap<BlendState, WGPUBlendState>();
}