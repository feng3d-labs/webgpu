import { reactive } from '@feng3d/reactivity';
import { ColorTargetState } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUBlendState } from './WGPUBlendState';

export class WGPUColorTargetState extends ReactiveObject
{
    readonly gpuColorTargetState: GPUColorTargetState;

    constructor(colorTargetState: ColorTargetState, format: GPUTextureFormat)
    {
        super();

        this._createGPUColorTargetState(colorTargetState, format);
        this._onMap(colorTargetState, format);
    }

    private _onMap(colorTargetState: ColorTargetState, format: GPUTextureFormat)
    {
        WGPUColorTargetState.cacheMap.set(colorTargetState, WGPUColorTargetState.cacheMap.get(colorTargetState) || new Map<GPUTextureFormat, WGPUColorTargetState>());
        WGPUColorTargetState.cacheMap.get(colorTargetState).set(format, this);
        this.destroyCall(() => { WGPUColorTargetState.cacheMap.get(colorTargetState).delete(format); });
    }

    private _createGPUColorTargetState(colorTargetState: ColorTargetState, format: GPUTextureFormat)
    {
        if (!colorTargetState) return { format };

        const r_this = reactive(this);
        const r_colorTargetState = reactive(colorTargetState);

        this.effect(() =>
        {
            // 计算
            const gpuColorTargetState: GPUColorTargetState = { format };

            if (r_colorTargetState.blend)
            {
                const wgpuBlendState = WGPUBlendState.getInstance(colorTargetState.blend);
                reactive(wgpuBlendState).gpuBlendState;
                gpuColorTargetState.blend = wgpuBlendState.gpuBlendState;
            }

            if (r_colorTargetState.writeMask)
            {
                //
                const red: boolean = r_colorTargetState.writeMask?.[0] ?? true;
                const green: boolean = r_colorTargetState.writeMask?.[1] ?? true;
                const blue: boolean = r_colorTargetState.writeMask?.[2] ?? true;
                const alpha: boolean = r_colorTargetState.writeMask?.[3] ?? true;

                gpuColorTargetState.writeMask = (red ? 1 : 0) + (green ? 2 : 0) + (blue ? 4 : 0) + (alpha ? 8 : 0);
            }

            r_this.gpuColorTargetState = gpuColorTargetState;
        });
    }

    static getInstance(colorTargetState: ColorTargetState, format: GPUTextureFormat)
    {
        return this.cacheMap.get(colorTargetState)?.get(format) || new WGPUColorTargetState(colorTargetState, format);
    }

    static readonly cacheMap = new WeakMap<ColorTargetState, Map<GPUTextureFormat, WGPUColorTargetState>>();
}