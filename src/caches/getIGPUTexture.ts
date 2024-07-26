import { IGPUTexture, IGPUTextureFromContext, IGPUTextureSize } from "../data/IGPUTexture";
import { IAttachmentSize } from "../data/IRenderPass";

export function getIGPUTexture(texture: IGPUTexture)
{
    let gpuTexture: IGPUTexture;

    if (isITextureFromContext(texture))
    {
        const gpuCanvasContext = texture.context;

        gpuCanvasContext["_gpuTexture"] = gpuCanvasContext["_gpuTexture"] || {
            ...texture,
            context: gpuCanvasContext
        };
        gpuTexture = gpuCanvasContext["_gpuTexture"];
    }
    else
    {
        gpuTexture = texture;
    }

    return gpuTexture;
}

function isITextureFromContext(arg: any): arg is IGPUTextureFromContext
{
    return !!(arg as IGPUTextureFromContext).context;
}

/**
 * 获取纹理尺寸。
 *
 * @param texture 纹理。
 * @returns 纹理尺寸。
 */
export function getIGPUTextureSize(texture: IGPUTexture)
{
    let size: IGPUTextureSize;
    if (isITextureFromContext(texture))
    {
        const element = document.getElementById(texture.context.canvasId) as HTMLCanvasElement;
        console.assert(!!element, `在 document 上没有找到 canvasId 为 ${texture.context.canvasId} 的画布。`);
        size = [element.width, element.height];
    }
    else
    {
        size = texture.size.concat() as any;
    }

    return size;
}

/**
 * 设置纹理与附件相同尺寸。
 *
 * @param texture 纹理描述。
 * @param attachmentSize 附件尺寸。
 */
export function setITextureSize(texture: IGPUTexture, attachmentSize: IAttachmentSize)
{
    if (isITextureFromContext(texture))
    {
        const element = document.getElementById(texture.context.canvasId) as HTMLCanvasElement;
        console.assert(!!element, `在 document 上没有找到 canvasId 为 ${texture.context.canvasId} 的画布。`);
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
