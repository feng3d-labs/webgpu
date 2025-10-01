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
            // 监听
            r_colorTargetState.blend;
            //
            const blend = colorTargetState.blend;
            const wgpuBlendState = WGPUBlendState.getInstance(blend);
            reactive(wgpuBlendState).gpuBlendState;
            const gpuBlendState = wgpuBlendState.gpuBlendState;

            // 监听
            r_colorTargetState.writeMask?.concat();
            //
            const writeMask = colorTargetState.writeMask ?? [true, true, true, true];
            let gpuWriteMask: GPUColorWriteFlags = (writeMask[0] ? 1 : 0) + (writeMask[1] ? 2 : 0) + (writeMask[2] ? 4 : 0) + (writeMask[3] ? 8 : 0);

            // 计算
            const gpuColorTargetState: GPUColorTargetState = {
                format,
                blend: gpuBlendState,
                writeMask: gpuWriteMask,
            };

            r_this.gpuColorTargetState = gpuColorTargetState;
        });
    }

    static getInstance(colorTargetState: ColorTargetState, format: GPUTextureFormat)
    {
        return this.cacheMap.get(colorTargetState)?.get(format) || new WGPUColorTargetState(colorTargetState, format);
    }

    static readonly cacheMap = new WeakMap<ColorTargetState, Map<GPUTextureFormat, WGPUColorTargetState>>();
}