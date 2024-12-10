import { anyEmitter } from "@feng3d/event";
import { getTexImageSourceSize, ITextureSize } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { IGPUCanvasTexture } from "../data/IGPUCanvasTexture";
import { IGPUTexture, IGPUTextureLike } from "../data/IGPUTexture";
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

    // 初始化纹理数据
    const updateSource = () =>
    {
        if (texture.source)
        {
            texture.source.forEach((v) =>
            {
                const copySize = v.copySize || getTexImageSourceSize(v.source.source);

                device.queue.copyExternalImageToTexture(
                    v.source,
                    {
                        texture: gpuTexture,
                        ...v.destination,
                    },
                    copySize
                );
            });
            texture.source = null;
        }
    };
    updateSource();
    watcher.watch(texture, "source", updateSource);

    // 监听写纹理操作
    const writeTexture = () =>
    {
        // 处理数据写入GPU缓冲
        if (texture.writeTextures)
        {
            texture.writeTextures.forEach((v) =>
            {
                const { destination, data, dataLayout, size } = v;

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
            texture.writeTextures = null;
        }
    };
    writeTexture();
    watcher.watch(texture, "writeTextures", writeTexture);

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
            watcher.unwatch(texture, "source", updateSource);
            watcher.unwatch(texture, "writeTextures", writeTexture);
            watcher.unwatch(texture, "size", resize);

            // 派发销毁事件
            anyEmitter.emit(gpuTexture, GPUTexture_destroy);
        };
    })(gpuTexture.destroy);

    return gpuTexture;
}
let autoIndex = 0;

const _GPUTextureMap = "_GPUTextureMap";