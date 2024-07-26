import { AnyEmitter, anyEmitter } from "@feng3d/event";
import { watcher } from "@feng3d/watcher";
import { IGPUTexture, IGPUTextureFromContext } from "../data/IGPUTexture";
import { generateMipmap } from "../utils/generate-mipmap";
import { getGPUCanvasContext } from "./getGPUCanvasContext";

/**
 * GPUTexture 相关事件。
 */
interface IGPUTextureEvent
{
    /**
     * 销毁事件。
     */
    "destroy": undefined;
}
/**
 * GPUTexture 事件派发器。
 */
export const gpuTextureEventEmitter: AnyEmitter<GPUTexture, IGPUTextureEvent> = <any>anyEmitter;

/**
 * 获取GPU纹理 {@link GPUTexture} 。
 *
 * @param device GPU设备。
 * @param texture 纹理描述。
 * @returns GPU纹理。
 */
export function getGPUTexture(device: GPUDevice, texture: IGPUTexture, autoCreate = true)
{
    if (isFromContext(texture))
    {
        const context = getGPUCanvasContext(device, texture.context);

        return context.getCurrentTexture();
    }

    let gpuTexture = textureMap.get(texture);
    if (gpuTexture) return gpuTexture;

    if (!autoCreate) return null;

    const usage = texture.usage;

    let mipLevelCount = texture.mipLevelCount;

    // 当需要生成 mipmap 并且 mipLevelCount 并未赋值时，将自动计算 可生成的 mipmap 数量。
    if (texture.generateMipmap && mipLevelCount === undefined)
    {
        //
        const maxSize = Math.max(texture.size[0], texture.size[1]);
        mipLevelCount = 1 + Math.log2(maxSize) | 0;
    }

    gpuTexture = device.createTexture({
        ...texture,
        mipLevelCount,
        usage,
    });

    // 初始化纹理数据
    const updateSource = () =>
    {
        if (texture.source)
        {
            texture.source.forEach((v) =>
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
                const [destination, data, dataLayout, size] = v;

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
            // 派发销毁事件
            gpuTextureEventEmitter.emit(gpuTexture, "destroy");
            //
            watcher.unwatch(texture, "source", updateSource);
            watcher.unwatch(texture, "writeTextures", writeTexture);
            watcher.unwatch(texture, "size", resize);
        };
    })(gpuTexture.destroy);

    textureMap.set(texture, gpuTexture);

    return gpuTexture;
}

const textureMap = new Map<IGPUTexture, GPUTexture>();

export function isFromContext(arg: IGPUTexture): arg is IGPUTextureFromContext
{
    return !!(arg as IGPUTextureFromContext).context;
}

/**
 * 获取纹理格式。
 *
 * @param texture 纹理。
 * @returns 纹理格式。
 */
export function getGPUTextureFormat(texture: IGPUTexture)
{
    if (isFromContext(texture))
    {
        return texture.context.configuration.format;
    }

    return texture.format;
}

/**
 * 设置纹理与附件相同尺寸。
 *
 * @param texture 纹理描述。
 * @param attachmentSize 附件尺寸。
 */
export function setIGPUTextureSize(texture: IGPUTexture, attachmentSize: { width: number, height: number })
{
    if (isFromContext(texture))
    {
        const element = document.getElementById(texture.context.canvasId) as HTMLCanvasElement;
        element.width = attachmentSize.width;
        element.height = attachmentSize.height;
    }
    else
    if (texture.size[2])
        {
            texture.size = [attachmentSize.width, attachmentSize.height, texture.size[2]];
        }
        else
        {
            texture.size = [attachmentSize.width, attachmentSize.height];
        }
}

/**
 * 获取 {@link GPUTexture} 数量。
 */
export function getGPUTextureNum()
{
    return textureMap.size;
}
