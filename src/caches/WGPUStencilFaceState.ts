import { reactive } from '@feng3d/reactivity';
import { StencilFaceState } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';

export class WGPUStencilFaceState extends ReactiveObject
{
    readonly gpuStencilFaceState: GPUStencilFaceState;

    constructor(stencilFaceState: StencilFaceState)
    {
        super();

        this._createGPUStencilFaceState(stencilFaceState);
        this._onMap(stencilFaceState);
    }

    private _createGPUStencilFaceState(stencilFaceState: StencilFaceState)
    {
        if (!stencilFaceState) return WGPUStencilFaceState.defaultGPUStencilFaceState;

        const r_this = reactive(this);
        const r_stencilFaceState = reactive(stencilFaceState);

        this.effect(() =>
        {
            // 监听
            r_stencilFaceState.compare;
            r_stencilFaceState.failOp;
            r_stencilFaceState.depthFailOp;
            r_stencilFaceState.passOp;

            // 计算
            const { compare, failOp, depthFailOp, passOp } = stencilFaceState;
            const gpuStencilFaceState: GPUStencilFaceState = {
                compare: compare ?? 'always',
                failOp: failOp ?? 'keep',
                depthFailOp: depthFailOp ?? 'keep',
                passOp: passOp ?? 'keep',
            };

            //
            r_this.gpuStencilFaceState = gpuStencilFaceState;
        });
    }

    private _onMap(stencilFaceState: StencilFaceState)
    {
        WGPUStencilFaceState.cacheMap.set(stencilFaceState, this);
        this.destroyCall(() => { WGPUStencilFaceState.cacheMap.delete(stencilFaceState); });
    }

    static getInstance(stencilFaceState: StencilFaceState)
    {
        return this.cacheMap.get(stencilFaceState) || new WGPUStencilFaceState(stencilFaceState);
    }

    static readonly cacheMap = new Map<StencilFaceState, WGPUStencilFaceState>();
    static readonly defaultGPUStencilFaceState: GPUStencilFaceState = {};
}