import { IAttachmentSize } from "../data/IAttachmentSize";
import { IGPUTexture, IGPUTextureFromContext, IGPUTextureSize } from "../data/IGPUTexture";
import { getGPUTexture } from "./getGPUTexture";

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
export function getGPUTextureSize(device: GPUDevice, texture: IGPUTexture)
{
    const gpuTexture = getGPUTexture(device, texture);

    const size: IGPUTextureSize = [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers];

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
