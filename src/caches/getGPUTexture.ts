import { AnyEmitter, anyEmitter } from "@feng3d/event";
import { watcher } from "@feng3d/watcher";
import { IGPUTexture, IGPUTextureBase, IGPUTextureFromContext } from "../data/IGPUTexture";
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
 * @param iGPUTextureBase 纹理描述。
 * @returns GPU纹理。
 */
export function getGPUTexture(device: GPUDevice, texture: IGPUTexture, autoCreate = true)
{
    if ((texture as IGPUTextureFromContext).context)
    {
        texture = texture as IGPUTextureFromContext;
        const context = getGPUCanvasContext(device, texture.context);

        return context.getCurrentTexture();
    }

    const iGPUTextureBase = texture as IGPUTextureBase;

    let gpuTexture = textureMap.get(iGPUTextureBase);
    if (gpuTexture) return gpuTexture;

    if (!autoCreate) return null;

    const usage = iGPUTextureBase.usage;

    let mipLevelCount = iGPUTextureBase.mipLevelCount;

    // 当需要生成 mipmap 并且 mipLevelCount 并未赋值时，将自动计算 可生成的 mipmap 数量。
    if (iGPUTextureBase.generateMipmap && mipLevelCount === undefined)
    {
        //
        const maxSize = Math.max(iGPUTextureBase.size[0], iGPUTextureBase.size[1]);
        mipLevelCount = 1 + Math.log2(maxSize) | 0;
    }

    gpuTexture = device.createTexture({
        ...iGPUTextureBase,
        mipLevelCount,
        usage,
    });

    // 初始化纹理数据
    const updateSource = () =>
    {
        if (iGPUTextureBase.source)
        {
            iGPUTextureBase.source.forEach((v) =>
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
            iGPUTextureBase.source = null;
        }
    };
    updateSource();
    watcher.watch(iGPUTextureBase, "source", updateSource);

    // 监听写纹理操作
    const writeTexture = () =>
    {
        // 处理数据写入GPU缓冲
        if (iGPUTextureBase.writeTextures)
        {
            iGPUTextureBase.writeTextures.forEach((v) =>
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
            iGPUTextureBase.writeTextures = null;
        }
    };
    writeTexture();
    watcher.watch(iGPUTextureBase, "writeTextures", writeTexture);

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
    watcher.watch(iGPUTextureBase, "size", resize);

    // 自动生成 mipmap。
    if (iGPUTextureBase.generateMipmap)
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
            textureMap.delete(iGPUTextureBase);
            // 派发销毁事件
            gpuTextureEventEmitter.emit(gpuTexture, "destroy");
            //
            watcher.unwatch(iGPUTextureBase, "source", updateSource);
            watcher.unwatch(iGPUTextureBase, "writeTextures", writeTexture);
            watcher.unwatch(iGPUTextureBase, "size", resize);
        };
    })(gpuTexture.destroy);

    textureMap.set(iGPUTextureBase, gpuTexture);

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
export function getGPUTextureFormat(device: GPUDevice, texture: IGPUTexture)
{
    const gpuTexture = getGPUTexture(device, texture);

    return gpuTexture.format;
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
