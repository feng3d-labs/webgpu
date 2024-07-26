import { ICanvasContext } from "./ICanvasContext";
import { IGPUTextureBase } from "./IGPUTexture";

/**
 * 纹理
 */
export type ITexture = ITextureFromContext | ITextureBase;

/**
 * 从画布的WebGPU上下文获取纹理
 */
export interface ITextureFromContext
{
    context: ICanvasContext;
}

/**
 * WebGPU 纹理描述
 */
export interface ITextureBase extends IGPUTextureBase
{
    /**
     * Indicates the type required for texture views bound to this binding.
     *
     * 当纹理为类似延迟渲染中不允许插值的浮点纹理时设置，设置后将会影响到绑定组的布局以及渲染管线布局。
     *
     * {@link GPUTextureBindingLayout.sampleType}
     */
    sampleType?: "unfilterable-float";
}
