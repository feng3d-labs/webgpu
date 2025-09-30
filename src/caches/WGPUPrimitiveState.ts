import { reactive } from "@feng3d/reactivity";
import { PrimitiveState } from "@feng3d/render-api";
import { ReactiveObject } from "../ReactiveObject";

export class WGPUPrimitiveState extends ReactiveObject
{
    readonly gpuPrimitiveState: GPUPrimitiveState;

    constructor(primitive: PrimitiveState, indexFormat: GPUIndexFormat)
    {
        super();

        this._onCreateGPUPrimitiveState(primitive, indexFormat);
        this._onMap(primitive, indexFormat);
    }

    private _onCreateGPUPrimitiveState(primitive: PrimitiveState, indexFormat: GPUIndexFormat)
    {
        if (!primitive) return WGPUPrimitiveState.defaultGPUPrimitiveState;

        const r_this = reactive(this);
        const r_primitive = reactive(primitive);

        this.effect(() =>
        {
            // 监听
            r_primitive.topology;
            r_primitive.cullFace;
            r_primitive.frontFace;
            r_primitive.unclippedDepth;

            // 计算
            const { topology, cullFace, frontFace, unclippedDepth } = primitive;
            const gpuPrimitive: GPUPrimitiveState = {
                topology: topology ?? 'triangle-list',
                stripIndexFormat: (topology === 'triangle-strip' || topology === 'line-strip') ? indexFormat : undefined,
                frontFace: frontFace ?? 'ccw',
                cullMode: cullFace ?? 'none',
                unclippedDepth: unclippedDepth ?? false,
            };

            r_this.gpuPrimitiveState = gpuPrimitive;
        });
    }

    private _onMap(primitive: PrimitiveState, indexFormat: GPUIndexFormat)
    {
        WGPUPrimitiveState.cacheMap.set(primitive, new Map<GPUIndexFormat, WGPUPrimitiveState>());
        WGPUPrimitiveState.cacheMap.get(primitive).set(indexFormat, this);
        this.destroyCall(() => { WGPUPrimitiveState.cacheMap.get(primitive).delete(indexFormat); });
    }

    static getInstance(primitive: PrimitiveState, indexFormat: GPUIndexFormat)
    {
        return this.cacheMap.get(primitive).get(indexFormat) || new WGPUPrimitiveState(primitive, indexFormat);
    }

    private static readonly cacheMap = new WeakMap<PrimitiveState, Map<GPUIndexFormat, WGPUPrimitiveState>>();
    private static readonly defaultGPUPrimitiveState: GPUPrimitiveState = { topology: 'triangle-list', cullMode: 'none', frontFace: 'ccw' };
}