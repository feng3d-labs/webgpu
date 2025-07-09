import { reactive } from '@feng3d/reactivity';
import { ChainMap, Texture, TextureDataSource, TextureDimension, TextureImageSource, TextureLike, TextureSource } from '@feng3d/render-api';
import { ReactiveClass } from '../ReactiveClass';
import { generateMipmap } from '../utils/generate-mipmap';
import { WGPUCanvasTexture } from './WGPUCanvasTexture';

/**
 * WebGPU纹理缓存类
 * 负责管理WebGPU纹理的创建、更新和销毁
 */
export class WGPUTexture extends ReactiveClass
{

    /**
     * 纹理描述符
     */
    readonly descriptor: GPUTextureDescriptor;

    /**
     * WebGPU纹理对象
     */
    readonly gpuTexture: GPUTexture;

    /**
     * 纹理是否有效
     */
    readonly invalid: boolean = true;

    /** GPU设备 */
    private readonly _device: GPUDevice;
    /** 纹理对象 */
    private readonly _texture: Texture;

    /**
     * 构造函数
     * @param device GPU设备
     * @param texture 纹理对象
     */
    constructor(device: GPUDevice, texture: Texture)
    {
        super();

        WGPUTexture._textureMap.set([device, texture], this);

        this._device = device;
        this._texture = texture;

        //
        const r_this = reactive(this);
        const r_texture = reactive(this._texture);

        // 监听纹理属性变化
        {
            const r_descriptor = reactive(texture.descriptor);

            let preDescriptor: GPUTextureDescriptor;
            this.effect(() =>
            {
                if (r_this.descriptor)
                {
                    r_descriptor.format;
                    r_descriptor.dimension;
                    r_descriptor.viewFormats;
                    r_descriptor.generateMipmap;
                    r_descriptor.mipLevelCount;
                    r_descriptor.size[0];
                    r_descriptor.size[1];
                    r_descriptor.size[2];
                    r_descriptor.sampleCount;

                    // 纹理参数变化时，重置纹理对象
                    if (preDescriptor === this.descriptor)
                    {
                        r_this.descriptor = null;
                    }
                }

                preDescriptor = this.descriptor;
            });

            this.effect(() =>
            {
                r_this.descriptor;

                r_this.gpuTexture = null;
            });
        }

        // 监听纹理变化
        {
            let preGPUTexture: GPUTexture;
            this.effect(() =>
            {
                r_this.gpuTexture;

                preGPUTexture?.destroy();
                preGPUTexture = this.gpuTexture;

                if (!this.gpuTexture)
                {
                    r_this.invalid = true;
                }
            });
        }

        // 监听写入纹理变化
        this.effect(() =>
        {
            if (r_texture.writeTextures?.length > 0)
            {
                r_this.invalid = true;
            }
        });
    }

    /**
     * 更新纹理
     * 创建或重新创建WebGPU纹理并处理纹理数据
     */
    update()
    {
        if (!this.invalid) return this;

        const texture = this._texture;
        const device = this._device;

        const r_this = reactive(this);
        const r_texture = reactive(texture);

        let descriptor = this.descriptor;

        // 创建纹理描述符
        if (!this.descriptor)
        {
            r_this.descriptor = descriptor = WGPUTexture._createGPUTextureDescriptor(texture);
        }

        // 创建WebGPU纹理
        let gpuTexture = this.gpuTexture;
        if (!gpuTexture)
        {
            // 创建纹理
            r_this.gpuTexture = gpuTexture = WGPUTexture._createGPUTexture(device, descriptor);

            // 初始化纹理内容
            WGPUTexture._writeTextures(device, gpuTexture, texture.sources);

            // 自动生成mipmap
            if (texture.descriptor.generateMipmap)
            {
                generateMipmap(device, gpuTexture);
            }
        }

        // 写入纹理数据
        if (texture.writeTextures?.length > 0)
        {
            WGPUTexture._writeTextures(device, gpuTexture, texture.writeTextures);

            r_texture.writeTextures = null;
        }

        r_this.invalid = false;

        return this;
    }

    /**
     * 销毁
     */
    destroy()
    {
        // 清理纹理
        reactive(this).gpuTexture = null;

        //
        WGPUTexture._textureMap.delete([this._device, this._texture]);

        super.destroy();
    }

    /**
     * 获取纹理实例
     * @param device GPU设备
     * @param textureLike 纹理对象
     * @param autoCreate 是否自动创建
     * @returns 纹理实例
     */
    static getInstance(device: GPUDevice, textureLike: TextureLike)
    {
        // 处理画布纹理
        if ('context' in textureLike)
        {
            return WGPUCanvasTexture.getInstance(device, textureLike);
        }

        return this._textureMap.get([device, textureLike]) || new WGPUTexture(device, textureLike);
    }

    /**
     * 销毁纹理实例
     * @param device GPU设备
     * @param textureLike 纹理对象
     */
    static destroy(device: GPUDevice, textureLike: TextureLike)
    {
        if ('context' in textureLike)
        {
            return WGPUCanvasTexture.destroy(device, textureLike);
        }

        WGPUTexture._textureMap.get([device, textureLike])?.destroy();
    }

    /**
     * 创建WebGPU纹理描述符
     * @param texture 纹理对象
     * @returns 纹理描述符
     */
    private static _createGPUTextureDescriptor(texture: Texture)
    {
        const descriptor = texture.descriptor;

        // 获取纹理属性
        const { format, size, dimension, viewFormats, generateMipmap, sampleCount } = descriptor;
        let { label, mipLevelCount } = descriptor;

        console.assert(!!size, `无法从纹理中获取到正确的尺寸！size与source必须设置一个！`, texture);

        const usage = WGPUTexture._getGPUTextureUsageFlags(format, sampleCount);

        // 自动计算mipmap层级数
        if (generateMipmap && mipLevelCount === undefined)
        {
            const maxSize = Math.max(size[0], size[1]);

            mipLevelCount = 1 + Math.log2(maxSize) | 0;
        }
        mipLevelCount = mipLevelCount ?? 1;

        // 设置标签
        if (label === undefined)
        {
            label = `GPUTexture ${WGPUTexture._autoIndex++}`;
        }

        const textureDimension = WGPUTexture._dimensionMap[dimension];

        const gpuTextureDescriptor: GPUTextureDescriptor = {
            label,
            size,
            mipLevelCount,
            sampleCount,
            dimension: textureDimension,
            format,
            usage,
            viewFormats,
        };

        return gpuTextureDescriptor;
    }

    /**
     * 写入纹理数据
     * @param device GPU设备
     * @param gpuTexture WebGPU纹理
     * @param textureSources 纹理数据源
     */
    static _writeTextures(device: GPUDevice, gpuTexture: GPUTexture, textureSources: readonly TextureSource[])
    {
        textureSources?.forEach((v) =>
        {
            // 处理图片纹理
            const imageSource = v as TextureImageSource;

            if (imageSource.image)
            {
                const { image, flipY, colorSpace, premultipliedAlpha, mipLevel, textureOrigin, aspect } = imageSource;

                // 获取图片尺寸
                const imageSize = TextureImageSource.getTexImageSourceSize(imageSource.image);
                const copySize = imageSource.size || imageSize;

                let imageOrigin = imageSource.imageOrigin;

                // 处理Y轴翻转
                if (flipY)
                {
                    const x = imageOrigin?.[0] ?? 0;
                    let y = imageOrigin?.[1] ?? 0;

                    y = imageSize[1] - y - copySize[1];

                    imageOrigin = [x, y];
                }

                // 设置源信息
                const gpuSource: GPUCopyExternalImageSourceInfo = {
                    source: image,
                    origin: imageOrigin,
                    flipY,
                };

                // 设置目标信息
                const gpuDestination: GPUCopyExternalImageDestInfo = {
                    colorSpace,
                    premultipliedAlpha,
                    mipLevel,
                    origin: textureOrigin,
                    aspect,
                    texture: gpuTexture,
                };

                // 复制图片到纹理
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

            // 计算数据布局参数
            const offset = dataLayout?.offset || 0;
            const width = dataLayout?.width || size[0];
            const height = dataLayout?.height || size[1];
            const x = dataImageOrigin?.[0] || 0;
            const y = dataImageOrigin?.[1] || 0;
            const depthOrArrayLayers = dataImageOrigin?.[2] || 0;

            // 获取像素字节数
            const bytesPerPixel = Texture.getTextureBytesPerPixel(gpuTexture.format);

            // 计算GPU偏移量
            const gpuOffset
                = (offset || 0) // 数据偏移
                + (depthOrArrayLayers || 0) * (width * height * bytesPerPixel) // 数组层偏移
                + (x + (y * width)) * bytesPerPixel // 像素偏移
                ;

            const gpuDataLayout: GPUTexelCopyBufferLayout = {
                offset: gpuOffset,
                bytesPerRow: width * bytesPerPixel,
                rowsPerImage: height,
            };

            // 写入纹理数据
            device.queue.writeTexture(
                gpuDestination,
                data,
                gpuDataLayout,
                size,
            );
        });
    }

    /**
     * 创建WebGPU纹理
     * @param device GPU设备
     * @param descriptor 纹理描述符
     * @returns WebGPU纹理
     */
    static _createGPUTexture(device: GPUDevice, descriptor: GPUTextureDescriptor)
    {
        // 检查bgra8unorm格式支持
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
     * 根据纹理格式和采样数确定纹理的使用标志
     *
     * @param format 纹理格式
     * @param sampleCount 采样数（多重采样时使用）
     * @returns 纹理使用标志
     */
    static _getGPUTextureUsageFlags(format: GPUTextureFormat, sampleCount?: 4): GPUTextureUsageFlags
    {
        let usage: GPUTextureUsageFlags;

        // 深度纹理、多重采样纹理和某些特定格式不支持存储绑定
        if (format.indexOf('depth') !== -1 // 深度纹理
            || sampleCount // 多重采样纹理
            || format === 'r8unorm'
            || format === 'bgra8unorm' // 需要设备支持 "bgra8unorm-storage" 特性
        )
        {
            // 基础使用标志（不包含存储绑定）
            usage = (0
                | GPUTextureUsage.COPY_SRC
                | GPUTextureUsage.COPY_DST
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT);
        }
        else
        {
            // 完整使用标志（包含存储绑定）
            usage = (0
                | GPUTextureUsage.COPY_SRC
                | GPUTextureUsage.COPY_DST
                | GPUTextureUsage.TEXTURE_BINDING
                | GPUTextureUsage.STORAGE_BINDING
                | GPUTextureUsage.RENDER_ATTACHMENT);
        }

        return usage;
    }

    /** 纹理维度映射表 */
    private static readonly _dimensionMap: Record<TextureDimension, GPUTextureDimension> = {
        '1d': '1d',
        '2d': '2d',
        '2d-array': '2d',
        cube: '2d',
        'cube-array': '3d',
        '3d': '3d',
    };

    /** 自动索引计数器 */
    private static _autoIndex = 0;
    /** 纹理实例映射表 */
    private static readonly _textureMap = new ChainMap<[device: GPUDevice, texture: TextureLike], WGPUTexture>();
}

