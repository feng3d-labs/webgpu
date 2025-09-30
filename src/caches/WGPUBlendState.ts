import { reactive } from "@feng3d/reactivity";
import { BlendState } from "@feng3d/render-api";
import { ReactiveObject } from "../ReactiveObject";

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
            // 监听
            r_blend.color;
            r_blend.alpha;
            // 计算
            const { color, alpha } = blendState;
            const gpuBlend: GPUBlendState = {
                color: this.getGPUBlendComponent(color),
                alpha: this.getGPUBlendComponent(alpha),
            };

            r_this.gpuBlendState = gpuBlend;
        });
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