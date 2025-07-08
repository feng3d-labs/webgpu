import { effect, reactive } from '@feng3d/reactivity';
import { ChainMap, Texture, TextureView } from '@feng3d/render-api';
import { WGPUCanvasTexture } from './WGPUCanvasTexture';
import { WGPUTexture } from './WGPUTexture';

export class WGPUTextureView
{
    /**
     * 获取纹理视图。
     *
     * @param device 设备。
     * @param view 纹理视图。
     * @returns 纹理视图。
     */
    static getInstance(device: GPUDevice, view: TextureView)
    {
        if (!view) return undefined;

        return this._gpuTextureViewMap.get([device, view]) || new WGPUTextureView(device, view);
    }

    private static readonly _gpuTextureViewMap = new ChainMap<[device: GPUDevice, view: TextureView], WGPUTextureView>();

    readonly textureView: GPUTextureView;

    readonly descriptor: GPUTextureViewDescriptor;

    readonly wgpuTexture: WGPUTexture | WGPUCanvasTexture;

    readonly invalid: boolean = true;

    private readonly _device: GPUDevice;
    private readonly _view: TextureView;

    constructor(device: GPUDevice, view: TextureView)
    {
        WGPUTextureView._gpuTextureViewMap.set([device, view], this);

        this._device = device;
        this._view = view;

        const r_this = reactive(this);
        const r_view = reactive(view);

        effect(() =>
        {
            r_view.texture;

            r_this.wgpuTexture = null;
            r_this.textureView = null;
            r_this.invalid = true;
        });

        effect(() =>
        {
            r_view.label;
            r_view.format;
            r_view.dimension;
            r_view.usage;
            r_view.aspect;
            r_view.baseMipLevel;
            r_view.baseArrayLayer;
            r_view.mipLevelCount;
            r_view.arrayLayerCount;

            r_this.descriptor = null;
            r_this.textureView = null;
            r_this.invalid = true;
        });
    }

    update()
    {
        if (!this.invalid) return;

        const r_this = reactive(this);

        if (!this.wgpuTexture)
        {
            r_this.wgpuTexture = WGPUTexture.getInstance(this._device, this._view.texture);
        }
        this.wgpuTexture.update();

        if (!this.descriptor)
        {
            r_this.descriptor = {
                ...this._view,
                label: this._view.label ?? `${this.wgpuTexture.gpuTexture.label}视图`,
                dimension: this._view.dimension ?? (this._view.texture as Texture).dimension,
            }
        }

        if (!this.textureView)
        {
            r_this.textureView = this.wgpuTexture.gpuTexture.createView(this.descriptor);
        }

        r_this.invalid = false;

        return this;
    }
}
