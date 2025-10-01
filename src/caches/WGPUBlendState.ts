import { reactive } from '@feng3d/reactivity';
import { BlendComponent, BlendState } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';

/**
 * WebGPU混合状态封装类
 *
 * 该类负责将引擎中的BlendState转换为WebGPU所需的GPUBlendState格式，
 * 并提供缓存机制避免重复创建相同的混合状态对象
 */
export class WGPUBlendState extends ReactiveObject
{
    /**
     * 对应的WebGPU混合状态对象
     * 只读属性，当原始BlendState发生变化时会自动更新
     */
    readonly gpuBlendState: GPUBlendState;

    /**
     * 构造函数
     * @param blendState 原始混合状态对象
     */
    constructor(blendState: BlendState)
    {
        super();

        this._createGPUBlendState(blendState);
        this._onMap(blendState);
    }

    /**
     * 创建并监听混合状态变化
     * @param blendState 原始混合状态对象
     */
    private _createGPUBlendState(blendState: BlendState)
    {
        const r_this = reactive(this);
        const r_blend = reactive(blendState);
        this.effect(() =>
        {
            const color = WGPUBlendState.getGPUBlendComponent(r_blend.color);
            const alpha = WGPUBlendState.getGPUBlendComponent(r_blend.alpha);

            // 构建WebGPU混合状态对象
            const gpuBlend: GPUBlendState = {
                color: color,
                alpha: alpha,
            };

            r_this.gpuBlendState = gpuBlend;
        });
    }

    /**
     * 将BlendComponent转换为GPUBlendComponent
     * @param blendComponent 原始混合组件
     * @returns 对应的WebGPU混合组件
     */
    private static getGPUBlendComponent(blendComponent?: BlendComponent): GPUBlendComponent
    {
        // 如果没有指定混合组件，则返回默认值
        if (!blendComponent) return { operation: 'add', srcFactor: 'one', dstFactor: 'zero' };

        // 解构混合组件属性
        const { operation, srcFactor, dstFactor } = blendComponent;
        // 当 operation 为 max 或 min 时，srcFactor 和 dstFactor 必须为 one。
        const gpuBlendComponent: GPUBlendComponent = {
            operation: operation ?? 'add',
            srcFactor: (operation === 'max' || operation === 'min') ? 'one' : (srcFactor ?? 'one'),
            dstFactor: (operation === 'max' || operation === 'min') ? 'one' : (dstFactor ?? 'zero'),
        };

        return gpuBlendComponent;
    }

    /**
     * 建立BlendState到WGPUBlendState的映射关系
     * @param blendState 原始混合状态对象
     */
    private _onMap(blendState: BlendState)
    {
        WGPUBlendState.cacheMap.set(blendState, this);
        this.destroyCall(() => { WGPUBlendState.cacheMap.delete(blendState); });
    }

    /**
     * 获取BlendState对应的WGPUBlendState实例
     * @param blendState 原始混合状态对象
     * @returns 对应的WGPUBlendState实例，如果传入为空则返回undefined
     */
    static getInstance(blendState: BlendState)
    {
        if (!blendState) return undefined;

        return this.cacheMap.get(blendState) || new WGPUBlendState(blendState);
    }

    /**
     * BlendState到WGPUBlendState的缓存映射表
     * 使用WeakMap避免内存泄漏
     */
    static readonly cacheMap = new WeakMap<BlendState, WGPUBlendState>();
}