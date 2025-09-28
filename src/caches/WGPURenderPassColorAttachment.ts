import { effect, reactive } from "@feng3d/reactivity";
import { RenderPassColorAttachment, RenderPassDescriptor, Texture, TextureLike, TextureView } from "@feng3d/render-api";
import { ReactiveObject } from "../ReactiveObject";
import { WGPUTextureLike } from "./WGPUTextureLike";
import { WGPUTextureView } from "./WGPUTextureView";

export class WGPURenderPassColorAttachment extends ReactiveObject
{
    readonly gpuRenderPassColorAttachment: GPURenderPassColorAttachment;

    constructor(device: GPUDevice, colorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
    {
        super();

        this._onCreateGPURenderPassColorAttachment(device, colorAttachment, descriptor);

        this._onMap(device, colorAttachment);
    }

    private _onCreateGPURenderPassColorAttachment(device: GPUDevice, colorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
    {
        const r_this = reactive(this);
        const r_colorAttachment = reactive(colorAttachment);
        const r_descriptor = reactive(descriptor);

        if (!descriptor.attachmentSize)
        {
            const gpuTextureLike = WGPUTextureLike.getInstance(device, colorAttachment.view.texture);
            const gpuTexture = gpuTextureLike.gpuTexture;

            reactive(descriptor).attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
        }

        this.effect(() =>
        {
            r_colorAttachment.view;
            r_colorAttachment.storeOp;
            r_colorAttachment.depthSlice;
            r_colorAttachment.clearValue?.concat();
            r_colorAttachment.loadOp;

            //
            const { view, depthSlice, clearValue, loadOp, storeOp } = r_colorAttachment;

            const wGPUTextureView = WGPUTextureView.getInstance(device, view);
            reactive(wGPUTextureView).textureView;

            const textureView = wGPUTextureView.textureView;

            //
            const gpuRenderPassColorAttachment: GPURenderPassColorAttachment = {
                view: textureView,
                depthSlice,
                clearValue,
                loadOp,
                storeOp,
            };

            //
            const sampleCount = r_descriptor.sampleCount;
            if (sampleCount)
            {
                const wgpuTexture = WGPUTextureLike.getInstance(device, view.texture);
                reactive(wgpuTexture).gpuTexture;

                const gpuTexture = wgpuTexture.gpuTexture;

                // 新增用于解决多重采样的纹理
                const multisampleTexture: Texture = {
                    descriptor: {
                        label: '自动生成多重采样的纹理',
                        sampleCount,
                        size: [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers],
                        format: gpuTexture.format,
                    },
                };

                const wGPUTextureView = WGPUTextureView.getInstance(device, { texture: multisampleTexture });
                const multisampleTextureView = wGPUTextureView.textureView;

                gpuRenderPassColorAttachment.view = multisampleTextureView;
                gpuRenderPassColorAttachment.resolveTarget = textureView;
            }

            r_this.gpuRenderPassColorAttachment = gpuRenderPassColorAttachment;
        });
    }


    /**
     * 获取用于解决多重采样的纹理视图。
     *
     * @param texture 接收多重采样结果的纹理。
     * @param sampleCount 多重采样数量。
     * @returns 用于解决多重采样的纹理视图。
     */
    private static getMultisampleTextureView(device: GPUDevice, texture: TextureLike, sampleCount: 4)
    {
        if (sampleCount !== 4) return undefined;
        if (!texture) return undefined;

        let multisampleTextureView = this.getMultisampleTextureViewMap.get(texture);

        if (multisampleTextureView) return multisampleTextureView;

        const gpuTextureLike = WGPUTextureLike.getInstance(device, texture);
        const gpuTexture = gpuTextureLike.gpuTexture;

        // 新增用于解决多重采样的纹理
        const multisampleTexture: Texture = {
            descriptor: {
                label: '自动生成多重采样的纹理',
                sampleCount,
                size: [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers],
                format: gpuTexture.format,
            },
        };

        multisampleTextureView = { texture: multisampleTexture };
        effect(() =>
        {
            // 新建的多重采样纹理尺寸与格式与原始纹理同步。
            reactive(multisampleTexture.descriptor).size = [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers];
            reactive(multisampleTexture.descriptor).format = gpuTexture.format;
        });

        this.getMultisampleTextureViewMap.set(texture, multisampleTextureView);

        return multisampleTextureView;
    }

    private _onMap(device: GPUDevice, colorAttachment: RenderPassColorAttachment)
    {
        device.colorAttachments ??= new WeakMap();
        device.colorAttachments.set(colorAttachment, this);
        this.destroyCall(() => { device.colorAttachments?.delete(colorAttachment); })
    }

    static getInstance(device: GPUDevice, colorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
    {
        return device.colorAttachments?.get(colorAttachment) || new WGPURenderPassColorAttachment(device, colorAttachment, descriptor);
    }

    /**
     * 获取颜色附件完整描述。
     */
    private static getGPURenderPassColorAttachment(device: GPUDevice, renderPassColorAttachment: RenderPassColorAttachment, descriptor: RenderPassDescriptor)
    {
        // 初始化附件尺寸。
        if (!descriptor.attachmentSize)
        {
            const gpuTextureLike = WGPUTextureLike.getInstance(device, renderPassColorAttachment.view.texture);
            const gpuTexture = gpuTextureLike.gpuTexture;

            reactive(descriptor).attachmentSize = { width: gpuTexture.width, height: gpuTexture.height };
        }

        attachment = {} as any;
        effect(() =>
        {
            // 监听
            const r_renderPassColorAttachment = reactive(renderPassColorAttachment);

            r_renderPassColorAttachment.view;
            r_renderPassColorAttachment.depthSlice;
            r_renderPassColorAttachment.clearValue;
            r_renderPassColorAttachment.loadOp;
            r_renderPassColorAttachment.storeOp;
            const r_descriptor = reactive(descriptor);

            r_descriptor.sampleCount;

            //
            let view = renderPassColorAttachment.view;
            const { depthSlice, clearValue, loadOp, storeOp } = renderPassColorAttachment;

            const { sampleCount } = descriptor;
            let resolveTarget: TextureView;

            if (sampleCount)
            {
                resolveTarget = view;
                view = this.getMultisampleTextureView(device, view.texture, sampleCount);
            }

            // 更新纹理尺寸
            effect(() =>
            {
                // 监听
                const r_descriptor = reactive(descriptor);

                r_descriptor.attachmentSize.width;
                r_descriptor.attachmentSize.height;

                // 执行
                this.setTextureSize(view.texture, descriptor.attachmentSize);
                resolveTarget && this.setTextureSize(resolveTarget.texture, descriptor.attachmentSize);

                // 更改纹理尺寸将会销毁重新创建纹理，需要重新获取view。
                attachment.view = WGPUTextureView.getInstance(device, view).textureView;
                attachment.resolveTarget = WGPUTextureView.getInstance(device, resolveTarget)?.textureView;
            });

            //
            attachment.depthSlice = depthSlice;
            attachment.clearValue = clearValue;
            attachment.loadOp = loadOp ?? 'clear';
            attachment.storeOp = storeOp ?? 'store';
        });
    }
}

declare global
{
    interface GPUDevice
    {
        colorAttachments: WeakMap<RenderPassColorAttachment, WGPURenderPassColorAttachment>;
    }
}
