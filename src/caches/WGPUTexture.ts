import { effect, EffectScope, Reactive, reactive } from '@feng3d/reactivity';
import { ChainMap, Texture, TextureDataSource, TextureDimension, TextureImageSource, TextureLike, TextureSource } from '@feng3d/render-api';
import { MultisampleTexture } from '../internal/MultisampleTexture';
import { generateMipmap } from '../utils/generate-mipmap';
import { WGPUCanvasTexture } from './WGPUCanvasTexture';

export class WGPUTexture
{
    /**
     * WebGPU 纹理
     */
    readonly gpuTexture: GPUTexture;

    /**
     * 是否无效
     */
    readonly invalid = true;

    private readonly _device: GPUDevice;
    private readonly _texture: Texture;
    private readonly _r_texture: Reactive<Texture>;

    readonly _descriptor: GPUTextureDescriptor;

    private readonly _r_this: Reactive<this>;
    private _effectScope = new EffectScope();

    constructor(device: GPUDevice, texture: Texture)
    {
        WGPUTexture._textureMap.set([device, texture], this);

        this._r_this = reactive(this);
        this._device = device;
        this._texture = texture;
        this._r_texture = reactive(this._texture);

        this._effectScope.run(() => this._init());
    }

    update()
    {
        if (!this.invalid) return this;

        const r_this = this._r_this;
        const texture = this._texture;
        const device = this._device;
        const r_texture = this._r_texture;

        let descriptor = this._descriptor;
        let gpuTexture = this.gpuTexture;

        if (!this._descriptor)
        {
            r_this._descriptor = descriptor = WGPUTexture._createGPUTextureDescriptor(texture);
        }

        if (!gpuTexture)
        {
            // 创建纹理
            r_this.gpuTexture = gpuTexture = WGPUTexture._createGPUTexture(device, descriptor);

            // 初始化纹理内容
            WGPUTexture._updateWriteTextures(device, gpuTexture, texture.sources);

            // 创建时自动生成 mipmap。
            if (texture.generateMipmap)
            {
                generateMipmap(device, gpuTexture);
            }
        }

        // 执行
        if (texture.writeTextures && texture.writeTextures.length > 0)
        {
            WGPUTexture._updateWriteTextures(device, gpuTexture, texture.writeTextures);

            r_texture.writeTextures = null;
        }

        r_this.invalid = true;

        return this;
    }

    private _init()
    {
        const r_texture = this._r_texture;
        const r_this = this._r_this;

        // 监听纹理变化
        effect(() =>
        {
            if (!r_this.gpuTexture) return;

            r_texture.format;
            r_texture.dimension;
            r_texture.viewFormats;
            r_texture.generateMipmap;
            r_texture.mipLevelCount;
            r_texture.size[0];
            r_texture.size[1];
            r_texture.size[2];
            (r_texture as MultisampleTexture).sampleCount;

            //
            r_this.gpuTexture = null;
        });

        // 触发销毁逻辑
        effect(() => { r_this.gpuTexture; this._destroyGPUTexture(); });

        // 触发写入纹理
        effect(() => { r_texture.writeTextures?.concat(); this._r_this.invalid = true; });
    }

    destroy()
    {
        this._effectScope.stop();
        this._effectScope = null;

        //
        this._r_this.gpuTexture = null;

        WGPUTexture._textureMap.delete([this._device, this._texture]);
    }

    private static _createGPUTextureDescriptor(texture: Texture)
    {
        // 执行
        const { format, dimension, viewFormats } = texture;
        const sampleCount = (texture as MultisampleTexture).sampleCount;
        let { label, mipLevelCount } = texture;

        const size = texture.size;

        console.assert(!!size, `无法从纹理中获取到正确的尺寸！size与source必须设置一个！`, texture);

        const usage = WGPUTexture._getGPUTextureUsageFlags(format, sampleCount);

        // 当需要生成 mipmap 并且 mipLevelCount 并未赋值时，将自动计算 可生成的 mipmap 数量。
        if (texture.generateMipmap && mipLevelCount === undefined)
        {
            //
            const maxSize = Math.max(size[0], size[1]);

            mipLevelCount = 1 + Math.log2(maxSize) | 0;
        }
        mipLevelCount = mipLevelCount ?? 1;

        if (label === undefined)
        {
            label = `GPUTexture ${WGPUTexture._autoIndex++}`;
        }

        const textureDimension = WGPUTexture._dimensionMap[dimension];

        const descriptor: GPUTextureDescriptor = {
            label,
            size,
            mipLevelCount,
            sampleCount,
            dimension: textureDimension,
            format,
            usage,
            viewFormats,
        };

        return descriptor;
    }

    static _updateWriteTextures(device: GPUDevice, gpuTexture: GPUTexture, textureSources: readonly TextureSource[])
    {
        textureSources?.forEach((v) =>
        {
            // 处理图片纹理
            const imageSource = v as TextureImageSource;

            if (imageSource.image)
            {
                const { image, flipY, colorSpace, premultipliedAlpha, mipLevel, textureOrigin, aspect } = imageSource;

                //
                const imageSize = TextureImageSource.getTexImageSourceSize(imageSource.image);
                const copySize = imageSource.size || imageSize;

                let imageOrigin = imageSource.imageOrigin;

                // 转换为WebGPU翻转模式
                if (flipY)
                {
                    const x = imageOrigin?.[0] ?? 0;
                    let y = imageOrigin?.[1] ?? 0;

                    y = imageSize[1] - y - copySize[1];

                    imageOrigin = [x, y];
                }

                //
                const gpuSource: GPUCopyExternalImageSourceInfo = {
                    source: image,
                    origin: imageOrigin,
                    flipY,
                };

                //
                const gpuDestination: GPUCopyExternalImageDestInfo = {
                    colorSpace,
                    premultipliedAlpha,
                    mipLevel,
                    origin: textureOrigin,
                    aspect,
                    texture: gpuTexture,
                };

                device.queue.copyExternalImageToTexture(
                    gpuSource,
                    gpuDestination,
                    copySize,
                );

                return;
            }

            // 处理数据纹理
            const bufferSource = v as TextureDataSource;
            const { data, dataLayout, dataImageOrigin, size, mipLevel, textureOrigin, aspect } = bufferSource;

            const gpuDestination: GPUTexelCopyTextureInfo = {
                mipLevel,
                origin: textureOrigin,
                aspect,
                texture: gpuTexture,
            };

            // 计算 WebGPU 中支持的参数
            const offset = dataLayout?.offset || 0;
            const width = dataLayout?.width || size[0];
            const height = dataLayout?.height || size[1];
            const x = dataImageOrigin?.[0] || 0;
            const y = dataImageOrigin?.[1] || 0;
            const depthOrArrayLayers = dataImageOrigin?.[2] || 0;

            // 获取纹理每个像素对应的字节数量。
            const bytesPerPixel = Texture.getTextureBytesPerPixel(gpuTexture.format);

            // 计算偏移
            const gpuOffset
                = (offset || 0) // 头部
                + (depthOrArrayLayers || 0) * (width * height * bytesPerPixel) // 读取第几张图片
                + (x + (y * width)) * bytesPerPixel // 读取图片位置
                ;

            const gpuDataLayout: GPUTexelCopyBufferLayout = {
                offset: gpuOffset,
                bytesPerRow: width * bytesPerPixel,
                rowsPerImage: height,
            };

            device.queue.writeTexture(
                gpuDestination,
                data,
                gpuDataLayout,
                size,
            );
        });
    }

    private _destroyGPUTexture()
    {
        if (!this.gpuTexture) return;

        if (this._preGPUTexture)
        {
            this._preGPUTexture.destroy();
            this._preGPUTexture = null;
        }

        this._preGPUTexture = this.gpuTexture;
    }

    private _preGPUTexture: GPUTexture = null;

    static getInstance(device: GPUDevice, textureLike: TextureLike, autoCreate = true)
    {
        if ('context' in textureLike)
        {
            return WGPUCanvasTexture.getInstance(device, textureLike);
        }

        let result = this._textureMap.get([device, textureLike]);

        if (!autoCreate) return result;

        return new WGPUTexture(device, textureLike);
    }

    static destroy(device: GPUDevice, textureLike: TextureLike)
    {
        if ('context' in textureLike)
        {
            return WGPUCanvasTexture.destroy(device, textureLike);
        }

        WGPUTexture._textureMap.get([device, textureLike])?.destroy();
    }

    static _createGPUTexture(device: GPUDevice, descriptor: GPUTextureDescriptor)
    {
        if (descriptor.format === 'bgra8unorm')
        {
            console.assert(!!device, `bgra8unorm 格式需要指定 GPUDevice 设备！`);
            console.assert(!!device && device.features.has('bgra8unorm-storage'), `当前设备不支持 bgra8unorm 格式！请使用其他格式或者添加 "bgra8unorm-storage" 特性！`);
        }

        // 创建纹理
        const gpuTexture = device.createTexture(descriptor);

        return gpuTexture
    }

    /**
     * 由纹理格式获取纹理可支持的用途。
     *
     * 包含深度、多重采样、以及个别的无法作为存储纹理。
     *
     * @param format
     * @param sampleCount
     * @returns
     */
    static _getGPUTextureUsageFlags(format: GPUTextureFormat, sampleCount?: 4): GPUTextureUsageFlags
    {
        let usage: GPUTextureUsageFlags;

        // 包含深度以及多重采样的纹理不支持 STORAGE_BINDING
        if (format.indexOf('depth') !== -1 // 包含深度的纹理
            || sampleCount // 多重采样纹理
            || format === 'r8unorm'
            || format === 'bgra8unorm' // 判断GPU设备是否支持 "bgra8unorm-storage" 特性。
        )
        {
            usage = (0
                | GPUTextureUsage.COPY_SRC
                | GPUTextureUsage.COPY_DST
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT);
        }
        else
        {
            usage = (0
                | GPUTextureUsage.COPY_SRC
                | GPUTextureUsage.COPY_DST
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.STORAGE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT);
        }

        return usage;
    }

    private static readonly _dimensionMap: Record<TextureDimension, GPUTextureDimension> = {
        '1d': '1d',
        '2d': '2d',
        '2d-array': '2d',
        cube: '2d',
        'cube-array': '3d',
        '3d': '3d',
    };

    private static _autoIndex = 0;
    private static readonly _textureMap = new ChainMap<[device: GPUDevice, texture: TextureLike], WGPUTexture>();
}

