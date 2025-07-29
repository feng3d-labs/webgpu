import { reactive } from '@feng3d/reactivity';
import { CanvasTexture, ChainMap } from '@feng3d/render-api';

import { webgpuEvents } from '../eventnames';
import { ReactiveObject } from '../ReactiveObject';
import { WGPUCanvasContext } from './WGPUCanvasContext';

/**
 * WebGPU画布纹理缓存类
 *
 * 负责管理WebGPU画布纹理的创建、更新和销毁
 * 继承自 ReactiveObject ，支持响应式属性监听
 */
export class WGPUCanvasTexture extends ReactiveObject
{
    /**
     * WebGPU画布上下文
     * 管理画布元素、GPU上下文和配置
     */
    readonly wgpuCanvasContext: WGPUCanvasContext;

    /**
     * WebGPU纹理对象
     */
    readonly gpuTexture: GPUTexture;

    /**
     * 是否需要更新。
     *
     * 当值为 true 时表示需要更新，当值为 false 时表示无需更新。
     */
    readonly needUpdate: boolean = true;

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

        this.effect(() => this._onCanvasSizeChanged());
        this.effect(() => this._onPreSubmit());
        this.effect(() => this._onWGPUCanvasContextChanged());
        this.effect(() => this._onGPUTextureChanged());
    }

    private _onPreSubmit()
    {
        reactive(webgpuEvents).preSubmit;
        reactive(this).gpuTexture = null;
    }

    private _onCanvasSizeChanged()
    {
        reactive(this._canvasTexture)._canvasSizeVersion;
        reactive(this).gpuTexture = null;
    }

    private _onWGPUCanvasContextChanged()
    {
        reactive(this).wgpuCanvasContext?.invalid;
        reactive(this).gpuTexture = null;
    }

    private _onGPUTextureChanged()
    {
        const r_this = reactive(this);
        r_this.gpuTexture;

        this._preGPUTexture?.destroy();
        this._preGPUTexture = this.gpuTexture;

        if (!this.gpuTexture)
        {
            r_this.needUpdate = true;
        }
    }

    private _preGPUTexture: GPUTexture;

    /**
     * 更新纹理
     *
     * 如果纹理失效，重新获取画布纹理
     */
    update()
    {
        if (!this.needUpdate) return;

        const r_this = reactive(this);

        if (!this.wgpuCanvasContext)
        {
            r_this.wgpuCanvasContext = WGPUCanvasContext.getInstance(this._device, this._canvasTexture.context);
        }
        this.wgpuCanvasContext.update();

        // 如果没有纹理，创建新的纹理
        if (!this.gpuTexture)
        {
            // 获取当前纹理
            const gpuTexture = this.wgpuCanvasContext.gpuCanvasContext.getCurrentTexture();

            // 设置纹理标签
            gpuTexture.label = 'GPU画布纹理';

            r_this.gpuTexture = gpuTexture;
        }

        r_this.needUpdate = false;

        return this;
    }

    /**
     * 销毁纹理实例
     *
     * 清理资源并调用父类销毁方法
     */
    destroy()
    {
        reactive(this).gpuTexture = null;

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
     * 纹理实例映射表
     *
     * 用于缓存和管理纹理实例，避免重复创建
     */
    private static readonly _textureMap = new ChainMap<[GPUDevice, CanvasTexture], WGPUCanvasTexture>();
}