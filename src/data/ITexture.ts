import { IGPUCanvasContext, IGPUTextureBase } from "./IGPUTexture";

/**
 * 纹理
 */
export type ITexture = ITextureFromContext | IGPUTextureBase;

/**
 * 从画布的WebGPU上下文获取纹理
 */
export interface ITextureFromContext
{
    context: IGPUCanvasContext;
}
