import { anyEmitter } from "@feng3d/event";
import { getTexImageSourceSize, ITextureSize } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { IGPUCanvasTexture } from "../data/IGPUCanvasTexture";
import { IGPUTexture, IGPUTextureBufferSource, IGPUTextureImageSource, IGPUTextureLike } from "../data/IGPUTexture";
import { GPUTexture_destroy, IGPUTexture_resize } from "../eventnames";
import { IGPUTextureMultisample } from "../internal/IGPUTextureMultisample";
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
export function getGPUTexture(device: GPUDevice, textureLike: IGPUTextureLike, autoCreate = true)
{
    let gpuTexture: GPUTexture;
    if ((textureLike as IGPUCanvasTexture).context)
    {
        const canvasTexture = textureLike as IGPUCanvasTexture;
        const context = getGPUCanvasContext(device, canvasTexture.context);

        gpuTexture = context.getCurrentTexture();

        return gpuTexture;
    }

    const texture = textureLike as IGPUTexture;

    const textureMap: Map<IGPUTextureLike, GPUTexture> = device[_GPUTextureMap] = device[_GPUTextureMap] || new Map<IGPUTextureLike, GPUTexture>();
    gpuTexture = textureMap.get(texture);
    if (gpuTexture) return gpuTexture;

    if (!autoCreate) return null;

    // 创建纹理
    const createTexture = () =>
    {
        const { format, sampleCount, dimension, viewFormats } = texture as IGPUTextureMultisample;
        let { label, mipLevelCount } = texture;

        const size = texture.size;
        console.assert(!!size, `无法从纹理中获取到正确的尺寸！size与source必须设置一个！`, texture);

        const usage = getTextureUsageFromFormat(format, sampleCount);

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
    const updateTexture = () =>
    {
        if (texture.sources)
        {
            texture.sources.forEach((v) =>
            {
                // 处理图片纹理
                const imageSource = v as IGPUTextureImageSource;
                if (imageSource.image)
                {
                    const { image, flipY, colorSpace, premultipliedAlpha, mipLevel, textureOrigin, aspect } = imageSource;

                    //
                    const copySize = imageSource.size || getTexImageSourceSize(imageSource.image);

                    let imageOrigin = imageSource.imageOrigin;

                    // 转换为WebGPU翻转模式
                    if (flipY)
                    {
                        let x = imageOrigin?.[0];
                        let y = imageOrigin?.[1];

                        const imageSize = getTexImageSourceSize(image);
                        y = imageSize[1] - y - copySize[1];

                        imageOrigin = [x, y];
                    }

                    //
                    const gpuSource: GPUImageCopyExternalImage = {
                        source: image,
                        origin: imageOrigin,
                        flipY: flipY,
                    };

                    //
                    const gpuDestination: GPUImageCopyTextureTagged = {
                        colorSpace: colorSpace,
                        premultipliedAlpha: premultipliedAlpha,
                        mipLevel: mipLevel,
                        origin: textureOrigin,
                        aspect: aspect,
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
                const bufferSource = v as IGPUTextureBufferSource;
                const { destination, data, dataLayout, size } = bufferSource;

                device.queue.writeTexture(
                    {
                        ...destination,
                        texture: gpuTexture,
                    },
                    data,
                    dataLayout,
                    size,
                );
            });
            texture.sources = null;
        }
    };
    updateTexture();
    watcher.watch(texture, "sources", updateTexture);

    // 监听纹理尺寸发生变化
    const resize = (newValue: ITextureSize, oldValue: ITextureSize) =>
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
            watcher.unwatch(texture, "sources", updateTexture);
            watcher.unwatch(texture, "size", resize);

            // 派发销毁事件
            anyEmitter.emit(gpuTexture, GPUTexture_destroy);
        };
    })(gpuTexture.destroy);

    return gpuTexture;
}
let autoIndex = 0;

const _GPUTextureMap = "_GPUTextureMap";