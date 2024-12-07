import { anyEmitter } from "@feng3d/event";
import { watcher } from "@feng3d/watcher";
import { IGPUCanvasTexture } from "../data/IGPUCanvasTexture";
import { IGPUTexture, IGPUTextureLike } from "../data/IGPUTexture";
import { GPUTexture_destroy, IGPUTexture_resize } from "../eventnames";
import { generateMipmap } from "../utils/generate-mipmap";
import { getGPUCanvasContext } from "./getGPUCanvasContext";
import { getTextureUsageFromFormat } from "./getTextureUsageFromFormat";
import { getGPUTextureDimension } from "./getGPUTextureDimension";

/**
 * 获取GPU纹理 {@link GPUTexture} 。
 *
 * @param device GPU设备。
 * @param iGPUTextureBase 纹理描述。
 * @returns GPU纹理。
 */
export function getGPUTexture(device: GPUDevice, texture: IGPUTextureLike, autoCreate = true)
{
    const textureMap: Map<IGPUTextureLike, GPUTexture> = device[_GPUTextureMap] = device[_GPUTextureMap] || new Map<IGPUTextureLike, GPUTexture>();
    let gpuTexture = textureMap.get(texture);
    if (gpuTexture) return gpuTexture;

    if ((texture as IGPUCanvasTexture).context)
    {
        texture = texture as IGPUCanvasTexture;
        const context = getGPUCanvasContext(device, texture.context);

        gpuTexture = context.getCurrentTexture();

        return gpuTexture;
    }

    if (!autoCreate) return null;

    const iGPUTexture = texture as IGPUTexture;

    const { format, sampleCount, dimension } = iGPUTexture;
    let { label, mipLevelCount } = iGPUTexture;

    const usage = getTextureUsageFromFormat(format, sampleCount);

    // 当需要生成 mipmap 并且 mipLevelCount 并未赋值时，将自动计算 可生成的 mipmap 数量。
    if (iGPUTexture.generateMipmap && mipLevelCount === undefined)
    {
        //
        const maxSize = Math.max(iGPUTexture.size[0], iGPUTexture.size[1]);
        mipLevelCount = 1 + Math.log2(maxSize) | 0;
    }

    if (label === undefined)
    {
        label = `GPUTexture ${autoIndex++}`;
    }

    const textureDimension = getGPUTextureDimension(dimension);

    gpuTexture = device.createTexture({
        ...iGPUTexture,
        dimension: textureDimension,
        label,
        mipLevelCount,
        usage,
    });

    // 初始化纹理数据
    const updateSource = () =>
    {
        if (iGPUTexture.source)
        {
            iGPUTexture.source.forEach((v) =>
            {
                device.queue.copyExternalImageToTexture(
                    v.source,
                    {
                        texture: gpuTexture,
                        ...v.destination,
                    },
                    v.copySize
                );
            });
            iGPUTexture.source = null;
        }
    };
    updateSource();
    watcher.watch(iGPUTexture, "source", updateSource);

    // 监听写纹理操作
    const writeTexture = () =>
    {
        // 处理数据写入GPU缓冲
        if (iGPUTexture.writeTextures)
        {
            iGPUTexture.writeTextures.forEach((v) =>
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
            iGPUTexture.writeTextures = null;
        }
    };
    writeTexture();
    watcher.watch(iGPUTexture, "writeTextures", writeTexture);

    // 监听纹理尺寸发生变化
    const resize = (newValue: GPUExtent3DStrict, oldValue: GPUExtent3DStrict) =>
    {
        if (!!newValue && !!oldValue)
        {
            if (newValue[0] === oldValue[0]
                && newValue[1] === oldValue[1]
                && newValue[2] === oldValue[2]
            )
            {
                return;
            }
        }

        gpuTexture.destroy();
        //
        anyEmitter.emit(texture, IGPUTexture_resize);
    };
    watcher.watch(iGPUTexture, "size", resize);

    // 自动生成 mipmap。
    if (iGPUTexture.generateMipmap)
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
            textureMap.delete(iGPUTexture);
            // 派发销毁事件
            anyEmitter.emit(gpuTexture, GPUTexture_destroy);
            //
            watcher.unwatch(iGPUTexture, "source", updateSource);
            watcher.unwatch(iGPUTexture, "writeTextures", writeTexture);
            watcher.unwatch(iGPUTexture, "size", resize);
        };
    })(gpuTexture.destroy);

    textureMap.set(iGPUTexture, gpuTexture);

    return gpuTexture;
}
let autoIndex = 0;

const _GPUTextureMap = "_GPUTextureMap";