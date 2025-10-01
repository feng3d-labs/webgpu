import { reactive } from '@feng3d/reactivity';
import { DepthStencilState } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUStencilFaceState } from './WGPUStencilFaceState';

export class WGPUDepthStencilState extends ReactiveObject
{
    readonly gpuDepthStencilState: GPUDepthStencilState;

    constructor(depthStencil: DepthStencilState, depthStencilFormat: GPUTextureFormat)
    {
        super();

        this._createGPUDepthStencilState(depthStencil, depthStencilFormat);
        this._onMap(depthStencil);
    }

    private _createGPUDepthStencilState(depthStencil: DepthStencilState, depthStencilFormat: GPUTextureFormat)
    {
        if (!depthStencil)
        {
            return WGPUDepthStencilState.getDefaultGPUDepthStencilState(depthStencilFormat);
        }

        const r_this = reactive(this);
        const r_depthStencil = reactive(depthStencil);

        this.effect(() =>
        {
            // 监听
            r_depthStencil.depthWriteEnabled;
            r_depthStencil.depthCompare;
            r_depthStencil.stencilFront;
            r_depthStencil.stencilBack;
            r_depthStencil.stencilReadMask;
            r_depthStencil.stencilWriteMask;
            r_depthStencil.depthBias;
            r_depthStencil.depthBiasSlopeScale;
            r_depthStencil.depthBiasClamp;

            // 计算
            const { depthWriteEnabled,
                depthCompare,
                stencilFront,
                stencilBack,
                stencilReadMask,
                stencilWriteMask,
                depthBias,
                depthBiasSlopeScale,
                depthBiasClamp,
            } = depthStencil;

            //
            const wgpuStencilFront = WGPUStencilFaceState.getInstance(stencilFront);
            reactive(wgpuStencilFront).gpuStencilFaceState;
            const gpuStencilFront = wgpuStencilFront.gpuStencilFaceState;

            //
            const wgpuStencilBack = WGPUStencilFaceState.getInstance(stencilBack);
            reactive(wgpuStencilBack).gpuStencilFaceState;
            const gpuStencilBack = wgpuStencilBack.gpuStencilFaceState;

            //
            const gpuDepthStencilState: GPUDepthStencilState = {
                format: depthStencilFormat,
                depthWriteEnabled: depthWriteEnabled ?? true,
                depthCompare: depthCompare ?? 'less',
                stencilFront: gpuStencilFront,
                stencilBack: gpuStencilBack,
                stencilReadMask: stencilReadMask ?? 0xFFFFFFFF,
                stencilWriteMask: stencilWriteMask ?? 0xFFFFFFFF,
                depthBias: depthBias ?? 0,
                depthBiasSlopeScale: depthBiasSlopeScale ?? 0,
                depthBiasClamp: depthBiasClamp ?? 0,
            };

            r_this.gpuDepthStencilState = gpuDepthStencilState;
        });
    }

    /**
     * 获取片段阶段完整描述。
     *
     * @param fragment 片段阶段描述。
     */
    private static getDefaultGPUDepthStencilState(depthStencilFormat: GPUTextureFormat)
    {
        let result = WGPUDepthStencilState.defaultGPUDepthStencilStates[depthStencilFormat];

        if (result) return result;

        result = WGPUDepthStencilState.defaultGPUDepthStencilStates[depthStencilFormat] = {
            format: depthStencilFormat,
            depthWriteEnabled: true,
            depthCompare: 'less',
            stencilFront: {},
            stencilBack: {},
            stencilReadMask: 0xFFFFFFFF,
            stencilWriteMask: 0xFFFFFFFF,
            depthBias: 0,
            depthBiasSlopeScale: 0,
            depthBiasClamp: 0,
        };

        return result;
    }

    private _onMap(depthStencil: DepthStencilState)
    {
        WGPUDepthStencilState.cacheMap.set(depthStencil, this);
        this.destroyCall(() => { WGPUDepthStencilState.cacheMap.delete(depthStencil); });
    }

    static getInstance(depthStencil: DepthStencilState, depthStencilFormat: GPUTextureFormat)
    {
        if (!depthStencilFormat) return undefined;

        return this.cacheMap.get(depthStencil) || new WGPUDepthStencilState(depthStencil, depthStencilFormat);
    }

    static readonly cacheMap = new WeakMap<DepthStencilState, WGPUDepthStencilState>();
    private static readonly defaultGPUDepthStencilStates: Record<GPUTextureFormat, GPUDepthStencilState> = {} as any;
}