import { anyEmitter } from "@feng3d/event";
import { CanvasTexture, Texture, TextureDataSource, TextureImageSource, TextureLike, TextureSize, TextureSource } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { GPUTexture_destroy, IGPUTexture_resize } from "../eventnames";
import { MultisampleTexture } from "../internal/MultisampleTexture";
import { generateMipmap } from "../utils/generate-mipmap";
import { getGPUCanvasContext } from "./getGPUCanvasContext";
import { getGPUTextureDimension } from "./getGPUTextureDimension";
import { getTextureUsageFromFormat } from "./getTextureUsageFromFormat";

/**
 * 获取GPU纹理 {@link GPUTexture} 。
 *
 * @param device GPU设备。
 * @param iGPUTextureBase 纹理描述。
 * @returns GPU纹理。
 */
export function getGPUTexture(device: GPUDevice, textureLike: TextureLike, autoCreate = true)
{
    let gpuTexture: GPUTexture;
    if ("context" in textureLike)
    {
        const canvasTexture = textureLike as CanvasTexture;
        const context = getGPUCanvasContext(device, canvasTexture.context);

        gpuTexture = context.getCurrentTexture();

        return gpuTexture;
    }

    const texture = textureLike as Texture;

    const textureMap: Map<TextureLike, GPUTexture> = device[_GPUTextureMap] = device[_GPUTextureMap] || new Map<TextureLike, GPUTexture>();
    gpuTexture = textureMap.get(texture);
    if (gpuTexture) return gpuTexture;

    if (!autoCreate) return null;

    // 创建纹理
    const createTexture = () =>
    {
        const { format, sampleCount, dimension, viewFormats } = texture as MultisampleTexture;
        let { label, mipLevelCount } = texture;

        const size = texture.size;
        console.assert(!!size, `无法从纹理中获取到正确的尺寸！size与source必须设置一个！`, texture);

        const usage = getTextureUsageFromFormat(device, format, sampleCount);

        // 当需要生成 mipmap 并且 mipLevelCount 并未赋值时，将自动计算 可生成的 mipmap 数量。
        if (texture.generateMipmap && mipLevelCount === undefined)
        {
            //
            const maxSize = Math.max(size[0], size[1]);
            mipLevelCount = 1 + Math.log2(maxSize) | 0;
        }
        mipLevelCount = (texture as any).mipLevelCount = mipLevelCount || 1;

        if (label === undefined)
        {
            label = `GPUTexture ${autoIndex++}`;
        }

        const textureDimension = getGPUTextureDimension(dimension);

        gpuTexture = device.createTexture({
            label,
            size,
            mipLevelCount,
            sampleCount,
            dimension: textureDimension,
            format,
            usage,
            viewFormats,
        });

        textureMap.set(texture, gpuTexture);
    };
    createTexture();

    // 更新纹理
    const updateSources = () =>
    {
        if (texture.sources)
        {
            const writeTextures: TextureSource[] = [];
            texture.sources.forEach((v) =>
            {
                writeTextures.push(v);
            });
            texture.writeTextures = writeTextures.concat(texture.writeTextures || []);
        }
    };
    updateSources();
    watcher.watch(texture, "sources", updateSources);

    const updateWriteTextures = () =>
    {
        if (texture.writeTextures)
        {
            texture.writeTextures.forEach((v) =>
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
                        const x = imageOrigin?.[0];
                        let y = imageOrigin?.[1];

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
                        copySize
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
                const bytesPerPixel = Texture.getTextureBytesPerPixel(texture.format);

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
            texture.writeTextures = null;
        }
    };

    updateWriteTextures();
    watcher.watch(texture, "writeTextures", updateWriteTextures);

    // 监听纹理尺寸发生变化
    const resize = (newValue: TextureSize, oldValue: TextureSize) =>
    {
        if (!!newValue && !!oldValue)
        {
            if (newValue[0] === oldValue[0]
                && newValue[1] === oldValue[1]
                && (newValue[2] || 1) === (oldValue[2] || 1)
            )
            {
                return;
            }
        }

        gpuTexture.destroy();
        //
        anyEmitter.emit(texture, IGPUTexture_resize);
    };
    watcher.watch(texture, "size", resize);

    // 自动生成 mipmap。
    if (texture.generateMipmap)
    {
        generateMipmap(device, gpuTexture);
    }

    //
    ((oldDestroy) =>
    {
        gpuTexture.destroy = () =>
        {
            oldDestroy.apply(gpuTexture);
            //
            textureMap.delete(texture);
            //
            watcher.unwatch(texture, "size", resize);
            watcher.unwatch(texture, "sources", updateSources);
            watcher.unwatch(texture, "writeTextures", updateWriteTextures);

            // 派发销毁事件
            anyEmitter.emit(gpuTexture, GPUTexture_destroy);

            return undefined;
        };
    })(gpuTexture.destroy);

    return gpuTexture;
}
let autoIndex = 0;

const _GPUTextureMap = "_GPUTextureMap";