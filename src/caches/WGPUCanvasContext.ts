import { reactive } from '@feng3d/reactivity';
import { CanvasContext } from '@feng3d/render-api';
import { watcher } from '@feng3d/watcher';

import '../data/polyfills/CanvasContext.ts';
import { ReactiveObject } from '../ReactiveObject';

/**
 * WebGPU画布上下文缓存类
 *
 * 负责管理WebGPU画布上下文的创建、配置和更新
 * 提供画布元素、GPU画布上下文和配置的统一管理
 */
export class WGPUCanvasContext extends ReactiveObject
{
    /**
     * 画布元素
     * 可以是HTMLCanvasElement或OffscreenCanvas
     */
    readonly canvas: HTMLCanvasElement | OffscreenCanvas;

    /**
     * WebGPU画布上下文
     * 用于与GPU进行交互的画布上下文对象
     */
    readonly gpuCanvasContext: GPUCanvasContext;

    /**
     * 画布上下文发生变化，版本号递增。
     */
    readonly version: number = 0;

    /**
     * 构造函数
     *
     * @param context 画布上下文对象
     */
    constructor(device: GPUDevice, context: CanvasContext)
    {
        super();

        //
        this._createGPUCanvasContext(context);
        this._onConfiguration(device, context);
        this._onCanvasChanged(context);
        this._onSizeChanged(context);

        //
        this._onMap(device, context);
    }

    private _onMap(device: GPUDevice, context: CanvasContext)
    {
        device.canvasContexts ??= new WeakMap<CanvasContext, WGPUCanvasContext>();
        device.canvasContexts.set(context, this);
        this.destroyCall(() => { device.canvasContexts.delete(context); });
    }

    /**
     * 画布ID变化时，重置画布相关对象
     */
    private _createGPUCanvasContext(context: CanvasContext)
    {
        const r_this = reactive(this);
        const r_context = reactive(context);

        this.effect(() =>
        {
            r_context.canvasId;

            const canvasId = context.canvasId;

            const canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) as HTMLCanvasElement : canvasId;
            const gpuCanvasContext = canvas?.getContext('webgpu') as GPUCanvasContext;

            // 根据canvasId类型获取画布元素
            r_this.canvas = canvas;
            r_this.gpuCanvasContext = gpuCanvasContext;
        });
    }

    /**
     * 配置变化时，重置配置对象
    */
    private _onConfiguration(device: GPUDevice, context: CanvasContext)
    {
        const r_this = reactive(this);
        const r_context = reactive(context);

        this.effect(() =>
        {
            if (!r_this.gpuCanvasContext) return;
            const gpuCanvasContext = this.gpuCanvasContext;

            const r_configuration = r_context.configuration;
            if (r_configuration)
            {
                // 监听配置的各个属性变化
                r_configuration.format;
                r_configuration.usage;
                r_configuration.viewFormats?.concat();
                r_configuration.colorSpace;
                r_configuration.toneMapping?.mode;
                r_configuration.alphaMode;
            }

            //
            const configuration = context.configuration;

            // 获取纹理格式，默认使用设备首选格式
            const format = configuration?.format ?? navigator.gpu.getPreferredCanvasFormat();

            // 构建纹理用途标志
            // 附加上 GPUTextureUsage.RENDER_ATTACHMENT
            const usage = (configuration?.usage ?? 0)
                | GPUTextureUsage.COPY_SRC
                | GPUTextureUsage.COPY_DST
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.STORAGE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT;

            // 创建GPU画布配置对象
            const gpuCanvasConfiguration: GPUCanvasConfiguration = {
                ...configuration,
                device: device,
                usage,
                format,
            };

            // 配置GPU画布上下文
            gpuCanvasContext.configure(gpuCanvasConfiguration);

            //
            r_this.version++;
        });
    }

    private _onCanvasChanged(context: CanvasContext)
    {
        const r_this = reactive(this);
        const r_context = reactive(context);

        const _onWidthChanged = () =>
        {
            r_context.width = canvas.width;
        }

        const _onHeightChanged = () =>
        {
            r_context.height = canvas.height;
        }

        let canvas: HTMLCanvasElement | OffscreenCanvas;
        this.effect(() =>
        {
            r_this.canvas;

            if (canvas)
            {
                watcher.unwatch(canvas, 'width', _onWidthChanged);
                watcher.unwatch(canvas, 'height', _onHeightChanged);
            }

            canvas = this.canvas;

            if (canvas)
            {
                watcher.watch(canvas, 'width', _onWidthChanged);
                watcher.watch(canvas, 'height', _onHeightChanged);
            }
        });

        // 注册销毁回调，确保在对象销毁时清理画布相关对象
        this.destroyCall(() =>
        {
            if (canvas)
            {
                watcher.unwatch(canvas, 'width', _onWidthChanged);
                watcher.unwatch(canvas, 'height', _onHeightChanged);
            }
        });
    }

    private _onSizeChanged(context: CanvasContext)
    {
        const r_this = reactive(this);
        const r_context = reactive(context);

        this.effect(() =>
        {
            r_this.canvas;

            if (!this.canvas) return;

            //
            this.canvas.width = r_context.width;
            this.canvas.height = r_context.height;
        });

    }

    /**
     * 获取画布上下文实例
     *
     * 使用单例模式，确保每个[device, context]组合只有一个实例
     *
     * @param device GPU设备
     * @param context 画布上下文对象
     * @returns 画布上下文实例
     */
    static getInstance(device: GPUDevice, context: CanvasContext)
    {
        return device.canvasContexts?.get(context) || new WGPUCanvasContext(device, context);
    }
}

declare global
{
    interface GPUDevice
    {
        canvasContexts: WeakMap<CanvasContext, WGPUCanvasContext>;
    }
}