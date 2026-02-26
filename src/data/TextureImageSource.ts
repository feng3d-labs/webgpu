import { ImageOrigin, ImageSize, TextureOrigin, TextureSize } from './Texture';

/**
 * 纹理的图片资源。
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texSubImage2D
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texSubImage3D
 *
 * 注：不再支持参数 `border`
 *
 * ### WebGPU
 *
 * @see GPUQueue.copyExternalImageToTexture
 */
export interface TextureImageSource
{
    /**
     * 数据类型。
     */
    readonly __type__?: 'TextureImageSource';

    /**
     * 图片资源。
     */
    image: TexImageSource;

    /**
     * 读取图片上的像素坐标。
     */
    imageOrigin?: ImageOrigin;

    /**
     * 写入纹理的mipmap层级索引。
     */
    mipLevel?: number;

    /**
     * Defines the origin of the copy - the minimum corner of the texture sub-region to copy to/from.
     * Together with `copySize`, defines the full copy sub-region.
     *
     * 写入纹理的位置。
     */
    textureOrigin?: TextureOrigin;

    /**
     * Extents of the content to write from `source` to `destination`.
     *
     * 写入尺寸。
     */
    size?: TextureSize

    /**
     * 是否Y轴翻转图片。
     *
     * 注：WebGL（先翻转，再拷贝）与WebGPU（先拷贝，再翻转）处理方式不一样。此次已WebGL为准。当拷贝全图时，效果一致。
     */
    flipY?: boolean;

    /**
     * 是否需要预乘透明度。
     */
    premultipliedAlpha?: boolean;
}

export class TextureImageSource
{
    /**
     * 获取纹理的图片资源尺寸。
     *
     * @param texImageSource 纹理的图片资源。
     * @returns
     */
    static getTexImageSourceSize(image: TexImageSource): ImageSize
    {
        let width: number;
        let height: number;

        if (image instanceof VideoFrame)
        {
            width = image.codedWidth;
            height = image.codedHeight;
        }
        else if (image instanceof HTMLVideoElement)
        {
            width = image.videoWidth;
            height = image.videoHeight;
        }
        else
        {
            width = image.width;
            height = image.height;
        }

        return [width, height];
    }
}
