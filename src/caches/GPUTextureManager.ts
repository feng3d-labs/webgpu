import { computed, Computed, reactive } from '@feng3d/reactivity';
import { ChainMap, Texture, TextureDataSource, TextureDimension, TextureImageSource, TextureLike, TextureSource } from '@feng3d/render-api';
import { webgpuEvents } from '../eventnames';
import { MultisampleTexture } from '../internal/MultisampleTexture';
import { generateMipmap } from '../utils/generate-mipmap';
import { GPUCanvasContextManager } from './GPUCanvasContextManager';

export class GPUTextureManager
{
    static getInstance(device: GPUDevice)
    {
        if (!device) return null;

        let result = GPUTextureManager._instanceMap.get(device);

        if (!result)
        {
            result = new GPUTextureManager(device);
            this._instanceMap.set(device, result);
        }
        result.refCount++;

        return result;
    }

    private static _instanceMap = new WeakMap<GPUDevice, GPUTextureManager>();

    readonly device: GPUDevice;

    private refCount = 0;

    constructor(device: GPUDevice)
    {
        this.device = device;
    }

    /**
     * 释放
     */
    release()
    {
        this.refCount--;

        if (this.refCount <= 0)
        {
            this.destroy();
        }
    }

    /**
     * 销毁
     */
    private destroy()
    {
        const r_this = reactive(this);

        //
        this._gpuTextureMap.clear();

        //
        r_this.device = null;
        r_this._gpuTextureMap = null;
    }

    /**
     * 获取GPU纹理 {@link GPUTexture} 。
     *
     * @param device GPU设备。
     * @param iGPUTextureBase 纹理描述。
     * @returns GPU纹理。
     */
    getGPUTexture(textureLike: TextureLike, autoCreate = true)
    {
        const device = this.device;
        let result = this._gpuTextureMap.get(textureLike);

        if (result) return result.value;

        if (!autoCreate) return null;

        result = computed(() =>
        {
            if ('context' in textureLike)
            {
                const canvasTexture = textureLike;

                // 确保在提交之前使用正确的画布纹理。
                reactive(webgpuEvents).preSubmit;
                reactive(canvasTexture)._canvasSizeVersion;

                const context = GPUCanvasContextManager.getGPUCanvasContext(device, canvasTexture.context);

                const gpuTexture = context.getCurrentTexture();

                gpuTexture.label = 'GPU画布纹理';

                return gpuTexture;
            }

            const texture = textureLike as MultisampleTexture;

            // 监听
            const r_texture = reactive(texture);

            r_texture.format;
            r_texture.sampleCount;
            r_texture.dimension;
            r_texture.viewFormats;
            r_texture.generateMipmap;
            r_texture.mipLevelCount;
            r_texture.size[0];
            r_texture.size[1];
            r_texture.size[2];

            // 执行
            const { format, sampleCount, dimension, viewFormats } = texture;
            let { label, mipLevelCount } = texture;

            const size = texture.size;

            console.assert(!!size, `无法从纹理中获取到正确的尺寸！size与source必须设置一个！`, texture);

            const usage = GPUTextureManager.getTextureUsageFromFormat(device, format, sampleCount);

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
                label = `GPUTexture ${GPUTextureManager.autoIndex++}`;
            }

            const textureDimension = GPUTextureManager.dimensionMap[dimension];

            // 创建纹理
            const gpuTexture = device.createTexture({
                label,
                size,
                mipLevelCount,
                sampleCount,
                dimension: textureDimension,
                format,
                usage,
                viewFormats,
            });

            GPUTextureManager.textureMap.get([device, textureLike])?.destroy(); // 销毁旧的纹理
            GPUTextureManager.textureMap.set([device, textureLike], gpuTexture);

            // 初始化纹理内容
            GPUTextureManager.updateSources(texture);
            GPUTextureManager.updateWriteTextures(device, gpuTexture, texture);

            // 自动生成 mipmap。
            if (texture.generateMipmap)
            {
                generateMipmap(device, gpuTexture);
            }

            return gpuTexture;
        });
        this._gpuTextureMap.set(textureLike, result);

        return result.value;
    }

    /**
     * 更新纹理
     * @param texture
     */
    private static updateSources(texture: Texture)
    {
        computed(() =>
        {
            const r_texture = reactive(texture);

            r_texture.sources;

            if (!texture.sources) return;

            const writeTextures: TextureSource[] = [];

            texture.sources.forEach((v) =>
            {
                writeTextures.push(v);
            });
            reactive(texture).writeTextures = writeTextures.concat(texture.writeTextures || []);
        }).value;
    }

    private static updateWriteTextures(device: GPUDevice, gpuTexture: GPUTexture, texture: Texture)
    {
        computed(() =>
        {
            // 监听
            const r_texture = reactive(texture);

            r_texture.writeTextures;

            // 执行
            if (!texture.writeTextures) return;

            const { writeTextures, format } = texture;

            reactive(texture).writeTextures = null;

            writeTextures.forEach((v) =>
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
                    const gpuSource: GPUImageCopyExternalImage = {
                        source: image,
                        origin: imageOrigin,
                        flipY,
                    };

                    //
                    const gpuDestination: GPUImageCopyTextureTagged = {
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

                const gpuDestination: GPUImageCopyTexture = {
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
                const bytesPerPixel = Texture.getTextureBytesPerPixel(format);

                // 计算偏移
                const gpuOffset
                    = (offset || 0) // 头部
                    + (depthOrArrayLayers || 0) * (width * height * bytesPerPixel) // 读取第几张图片
                    + (x + (y * width)) * bytesPerPixel // 读取图片位置
                    ;

                const gpuDataLayout: GPUImageDataLayout = {
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
        }).value;
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
    private static getTextureUsageFromFormat(device: GPUDevice, format: GPUTextureFormat, sampleCount?: 4): GPUTextureUsageFlags
    {
        let usage: GPUTextureUsageFlags;

        // 包含深度以及多重采样的纹理不支持 STORAGE_BINDING
        if (format.indexOf('depth') !== -1 // 包含深度的纹理
            || sampleCount // 多重采样纹理
            || format === 'r8unorm'
            || (!device.features.has('bgra8unorm-storage') && format === 'bgra8unorm') // 判断GPU设备是否支持 "bgra8unorm-storage" 特性。
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

    private static readonly dimensionMap: Record<TextureDimension, GPUTextureDimension> = {
        '1d': '1d',
        '2d': '2d',
        '2d-array': '2d',
        cube: '2d',
        'cube-array': '3d',
        '3d': '3d',
    };

    private static autoIndex = 0;
    readonly _gpuTextureMap = new Map<TextureLike, Computed<GPUTexture>>();
    private static readonly textureMap = new ChainMap<[device: GPUDevice, texture: Texture], GPUTexture>();
}

