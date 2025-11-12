import { CanvasConfiguration } from '../CanvasConfiguration';

/**
 * 扩展 @feng3d/render-api 模块
 *
 * 为 CanvasContext 接口添加 WebGPU 相关的配置属性
 * 使 CanvasContext 能够支持 WebGPU 画布配置
 */
declare module '@feng3d/render-api'
{
    /**
     * 扩展 CanvasContext 接口
     *
     * 添加 WebGPU 画布配置支持，使画布上下文能够配置 GPU 相关参数
     *
     * @see GPUCanvasContext - WebGPU 画布上下文接口
     * @see GPUCanvasContext.configure - WebGPU 画布配置方法
     */
    export interface CanvasContext
    {
        /**
         * WebGPU 画布配置
         *
         * 包含纹理格式、用途、颜色空间、色调映射等配置参数
         * 用于配置 WebGPU 画布上下文的渲染参数
         *
         * 可选属性，如果未提供则使用默认配置
         */
        readonly configuration?: CanvasConfiguration;
    }
}
