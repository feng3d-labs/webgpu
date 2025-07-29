import { reactive } from '@feng3d/reactivity';
import { CanvasContext, ChainMap } from '@feng3d/render-api';
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
     * WebGPU画布配置
     * 包含格式、用途、颜色空间等配置信息
     */
    readonly gpuCanvasConfiguration: GPUCanvasConfiguration;

    /**
     * 是否需要更新。
     */
    readonly needUpdate: boolean = true;

    /**
     * GPU设备
     */
    private readonly _device: GPUDevice;

    /**
     * 画布上下文对象
     */
    private readonly _context: CanvasContext;

    /**
     * 构造函数
     *
     * @param device GPU设备
     * @param context 画布上下文对象
     */
    constructor(device: GPUDevice, context: CanvasContext)
    {
        super();

        this._device = device;
        this._context = context;

        // 注册到画布上下文映射表
        WGPUCanvasContext._canvasContextMap.set([device, context], this);

        this.effect(() => this._onCanvasIdChange());
        this.effect(() => this._onConfigurationChange());
        this.effect(() => this._onCanvasChanged());
        this.effect(() => this._onSizeChanged());
    }

    /**
     * 更新画布上下文
     *
     * 根据当前状态创建或重新配置画布上下文
     * 包括获取画布元素、创建GPU上下文、配置GPU参数
     *
     * @returns 当前实例，支持链式调用
     */
    update()
    {
        if (!this.needUpdate) return this;

        const r_this = reactive(this);

        // 获取画布元素
        if (!this.canvas)
        {
            const canvasId = this._context.canvasId;

            // 根据canvasId类型获取画布元素
            r_this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) as HTMLCanvasElement : canvasId;
        }

        // 获取WebGPU画布上下文
        if (!this.gpuCanvasContext)
        {
            r_this.gpuCanvasContext = this.canvas?.getContext('webgpu') as GPUCanvasContext;
        }

        // 配置GPU画布参数
        if (!this.gpuCanvasConfiguration)
        {
            const configuration = this._context.configuration;

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
                device: this._device,
                usage,
                format,
            };

            // 配置GPU画布上下文
            this.gpuCanvasContext.configure(gpuCanvasConfiguration);

            r_this.gpuCanvasConfiguration = gpuCanvasConfiguration;
        }

        r_this.needUpdate = false;

        return this;
    }

    /**
     * 画布ID变化时，重置画布相关对象
     */
    private _onCanvasIdChange()
    {
        const r_context = reactive(this._context);
        r_context.canvasId;

        // 画布ID变化时，重置画布相关对象
        const r_this = reactive(this);
        r_this.canvas = null;
        r_this.gpuCanvasContext = null;
        r_this.needUpdate = true;
    }

    /**
     * 配置变化时，重置配置对象
     */
    private _onConfigurationChange()
    {
        const r_context = reactive(this._context);

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

        // 配置变化时，重置GPU画布配置
        const r_this = reactive(this);
        r_this.gpuCanvasConfiguration = null;
        r_this.needUpdate = true;
    }

    private _onCanvasChanged()
    {
        reactive(this).canvas;

        if (this._preCanvas)
        {
            watcher.unwatch(this._preCanvas, 'width', this._onCanvasWidthChanged);
            watcher.unwatch(this._preCanvas, 'height', this._onCanvasHeightChanged);
        }

        this._preCanvas = this.canvas;

        if (this._preCanvas)
        {
            watcher.watch(this._preCanvas, 'width', this._onCanvasWidthChanged);
            watcher.watch(this._preCanvas, 'height', this._onCanvasHeightChanged);
        }
    }

    private _preCanvas: HTMLCanvasElement | OffscreenCanvas;

    private _onCanvasWidthChanged()
    {
        reactive(this._context).width = this.canvas.width;
        reactive(this).needUpdate = true;
    }

    private _onCanvasHeightChanged()
    {
        reactive(this._context).height = this.canvas.height;
        reactive(this).needUpdate = true;
    }

    private _onSizeChanged()
    {
        this.canvas.width = reactive(this._context).width;
        this.canvas.height = reactive(this._context).height;
        reactive(this).needUpdate = true;
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
        return WGPUCanvasContext._canvasContextMap.get([device, context]) || new WGPUCanvasContext(device, context);
    }

    /**
     * 画布上下文实例映射表
     *
     * 用于缓存和管理画布上下文实例，避免重复创建
     * 键为[device, context]组合，确保唯一性
     */
    private static readonly _canvasContextMap = new ChainMap<[device: GPUDevice, context: CanvasContext], WGPUCanvasContext>();
}