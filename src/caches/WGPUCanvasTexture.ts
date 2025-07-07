import { reactive } from '@feng3d/reactivity';
import { CanvasContext, CanvasTexture, ChainMap } from '@feng3d/render-api';

import { webgpuEvents } from '../eventnames';
import { ReactiveClass } from '../ReactiveClass';
import { WGPUCanvasContext } from './GPUCanvasContextManager';

/**
 * WebGPU画布纹理缓存类
 *
 * 负责管理WebGPU画布纹理的创建、更新和销毁
 * 继承自ReactiveClass，支持响应式属性监听
 */
export class WGPUCanvasTexture extends ReactiveClass
{
    /**
     * WebGPU纹理对象
     */
    readonly gpuTexture: GPUTexture;

    /**
     * 纹理是否失效
     * true表示需要更新，false表示有效
     */
    readonly invalid: boolean = true;

    /**
     * GPU设备
     */
    private readonly _device: GPUDevice;

    /**
     * 画布纹理对象
     */
    private readonly _canvasTexture: CanvasTexture;

    /**
     * 构造函数
     *
     * @param device GPU设备
     * @param canvasTexture 画布纹理对象
     */
    constructor(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        super();

        this._device = device;
        this._canvasTexture = canvasTexture;

        // 注册到纹理映射表
        WGPUCanvasTexture._textureMap.set([device, canvasTexture], this);

        const r_this = reactive(this);

        // 监听画布和事件变化，重置纹理
        {
            const r_canvasTexture = reactive(canvasTexture);
            const r_webgpuEvents = reactive(webgpuEvents);

            let preGPUTexture: GPUTexture;
            this.effect(() =>
            {
                if (!r_this.gpuTexture) return;

                // 监听画布尺寸版本和预提交事件
                r_webgpuEvents.preSubmit;
                r_canvasTexture._canvasSizeVersion;

                // 如果纹理没有变化，重置纹理
                if (preGPUTexture === this.gpuTexture)
                {
                    r_this.gpuTexture = null;
                }

                preGPUTexture = this.gpuTexture;
            });
        }

        // 监听纹理变化，管理纹理生命周期
        {
            let preGPUTexture: GPUTexture;
            this.effect(() =>
            {
                r_this.gpuTexture;

                // 销毁前一个纹理
                preGPUTexture?.destroy();
                preGPUTexture = this.gpuTexture;

                // 如果没有纹理，标记为失效
                if (!this.gpuTexture)
                {
                    r_this.invalid = true;
                }
            });
        }
    }

    /**
     * 更新纹理
     *
     * 如果纹理失效，重新获取画布纹理
     */
    update()
    {
        if (!this.invalid) return;

        const r_this = reactive(this);

        // 如果没有纹理，创建新的纹理
        if (!this.gpuTexture)
        {
            r_this.gpuTexture = WGPUCanvasTexture._getCanvasCurrentGPUTexture(this._device, this._canvasTexture.context);
        }

        r_this.invalid = false;

        return this;
    }

    /**
     * 销毁纹理实例
     *
     * 清理资源并调用父类销毁方法
     */
    destroy()
    {
        // 从纹理映射表中移除
        WGPUCanvasTexture._textureMap.delete([this._device, this._canvasTexture]);

        super.destroy();
    }

    /**
     * 获取纹理实例
     *
     * @param device GPU设备
     * @param canvasTexture 画布纹理对象
     * @returns 纹理实例
     */
    static getInstance(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        return this._textureMap.get([device, canvasTexture]) || new WGPUCanvasTexture(device, canvasTexture);
    }

    /**
     * 销毁纹理实例
     *
     * @param device GPU设备
     * @param canvasTexture 画布纹理对象
     */
    static destroy(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        this._textureMap.get([device, canvasTexture])?.destroy();
    }

    /**
     * 获取画布GPU纹理
     *
     * 从画布上下文获取当前纹理并设置标签
     *
     * @param device GPU设备
     * @param canvasContext 画布上下文
     * @returns GPU纹理
     */
    static _getCanvasCurrentGPUTexture(device: GPUDevice, canvasContext: CanvasContext)
    {
        // 获取GPU画布上下文
        const context = WGPUCanvasContext.getInstance(device, canvasContext);

        // 获取当前纹理
        const gpuTexture = context.gpuCanvasContext.getCurrentTexture();

        // 设置纹理标签
        gpuTexture.label = 'GPU画布纹理';

        return gpuTexture;
    }

    /**
     * 纹理实例映射表
     *
     * 用于缓存和管理纹理实例，避免重复创建
     */
    private static readonly _textureMap = new ChainMap<[GPUDevice, CanvasTexture], WGPUCanvasTexture>();
}