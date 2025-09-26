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
     * WebGPU纹理对象
     */
    readonly gpuTexture: GPUTexture;

    /**
     * 构造函数
     *
     * @param _device GPU设备
     * @param _canvasTexture 画布纹理对象
     */
    constructor(private readonly _device: GPUDevice, private readonly _canvasTexture: CanvasTexture)
    {
        super();

        // 注册到纹理映射表
        WGPUCanvasTexture._textureMap.set([_device, _canvasTexture], this);
        this._destroyItems.push(() => { WGPUCanvasTexture._textureMap.delete([this._device, this._canvasTexture]); });

        this._createGPUTexture(_device, _canvasTexture);
    }

    private _createGPUTexture(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        const r_this = reactive(this);
        const r_canvasTexture = reactive(canvasTexture);

        const destroyGPUTexture = () =>
        {
            this.gpuTexture?.destroy();
            r_this.gpuTexture = null;
        }

        this.effect(() =>
        {
            destroyGPUTexture();

            reactive(webgpuEvents).preSubmit;

            r_canvasTexture.context;

            const context = canvasTexture.context;

            //
            const wgpuCanvasContext = WGPUCanvasContext.getInstance(device, context);
            reactive(wgpuCanvasContext).version;

            const gpuCanvasContext = wgpuCanvasContext.gpuCanvasContext;

            // 获取当前纹理
            const gpuTexture = gpuCanvasContext.getCurrentTexture();

            // 设置纹理标签
            gpuTexture.label = 'GPU画布纹理';

            r_this.gpuTexture = gpuTexture;
        });

        this._destroyItems.push(destroyGPUTexture);
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