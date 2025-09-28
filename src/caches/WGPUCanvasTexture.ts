import { reactive } from '@feng3d/reactivity';
import { CanvasTexture } from '@feng3d/render-api';

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
     * @param device GPU设备
     * @param canvasTexture 画布纹理对象
     */
    constructor(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        super();

        //
        this._createGPUTexture(device, canvasTexture);

        //
        this._onMap(device, canvasTexture);
    }

    private _onMap(device: GPUDevice, canvasTexture: CanvasTexture)
    {
        device.canvasTextures ??= new WeakMap<CanvasTexture, WGPUCanvasTexture>();
        device.canvasTextures.set(canvasTexture, this);
        this.destroyCall(() => { device.canvasTextures.delete(canvasTexture); });
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

            reactive(device.queue).preSubmit;

            r_canvasTexture.context;

            const context = canvasTexture.context;

            //
            const wgpuCanvasContext = WGPUCanvasContext.getInstance(device, context);
            reactive(wgpuCanvasContext).gpuCanvasContext;
            reactive(wgpuCanvasContext).version;

            const gpuCanvasContext = wgpuCanvasContext.gpuCanvasContext;

            // 获取当前纹理
            const gpuTexture = gpuCanvasContext.getCurrentTexture();

            // 设置纹理标签
            gpuTexture.label = 'GPU画布纹理';

            r_this.gpuTexture = gpuTexture;
        });

        this.destroyCall(destroyGPUTexture);
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
        return device.canvasTextures?.get(canvasTexture) || new WGPUCanvasTexture(device, canvasTexture);
    }
}

declare global
{
    interface GPUDevice
    {
        canvasTextures: WeakMap<CanvasTexture, WGPUCanvasTexture>;
    }
}