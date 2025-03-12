import { CanvasContext } from "@feng3d/render-api";

/**
 * 画布纹理，从画布的WebGPU上下文获取纹理
 */
export interface IGPUCanvasTexture
{
    context: CanvasContext;
}
