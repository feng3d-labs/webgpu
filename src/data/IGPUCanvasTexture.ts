import { IGPUCanvasContext } from "./IGPUCanvasContext";

/**
 * 画布纹理，从画布的WebGPU上下文获取纹理
 */
export interface IGPUCanvasTexture
{
    context: IGPUCanvasContext;
}
