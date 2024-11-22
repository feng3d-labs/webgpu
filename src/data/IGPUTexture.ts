import { IGPUCanvasConfiguration } from "./IGPUCanvasConfiguration";

/**
 * 纹理
 */
export type IGPUTexture = IGPUTextureFromContext | IGPUTextureBase;

export type IGPUTextureSize = [width: number, height?: number, depthOrArrayLayers?: number];

/**
 * @see GPUTextureDescriptor
 */
export interface IGPUTextureBase extends GPUTextureDescriptor
{
    /**
     * The width, height, and depth or layer count of the texture.
     */
    size: IGPUTextureSize;

    /**
     * 初始纹理数据。
     *
     * 使用 GPUQueue.copyExternalImageToTexture 进行初始化。
     *
     * @see GPUQueue.copyExternalImageToTexture
     */
    source?: IGPUCopyExternalImageToTexture[];

    /**
     * 是否生成 mipmap。
     */
    generateMipmap?: boolean;

    /**
     * 向纹理中写入数据。
     *
     * @see GPUQueue.writeTexture
     */
    writeTextures?: IGPUWriteTexture[];
}

/**
 * 写纹理 GPUQueue.writeTexture 参数列表。
 *
 * @see GPUQueue.writeTexture
 */
export type IGPUWriteTexture = [destination: IGImageCopyTexture, data: BufferSource | SharedArrayBuffer, dataLayout: GPUImageDataLayout, size: GPUExtent3DStrict];

export interface IGPUCopyExternalImageToTexture
{
    source: GPUImageCopyExternalImage,
    destination: IGPUImageCopyTextureTagged,
    copySize: GPUExtent3DStrict
}

export interface IGPUImageCopyTextureTagged extends Omit<GPUImageCopyTextureTagged, "texture">
{
}

/**
 * @see GPUImageCopyTexture
 */
export interface IGImageCopyTexture
{
    /**
     * Mip-map level of the {@link GPUImageCopyTexture#texture} to copy to/from.
     */
    mipLevel?: GPUIntegerCoordinate;
    /**
     * Defines the origin of the copy - the minimum corner of the texture sub-region to copy to/from.
     * Together with `copySize`, defines the full copy sub-region.
     */
    origin?: GPUOrigin3D;
    /**
     * Defines which aspects of the {@link GPUImageCopyTexture#texture} to copy to/from.
     */
    aspect?: GPUTextureAspect;
}

/**
 * 从画布的WebGPU上下文获取纹理
 */
export interface IGPUTextureFromContext
{
    context: IGPUCanvasContext;
}

/**
 * @see GPUCanvasContext
 * @see HTMLCanvasElement.getContext
 * @see GPUCanvasContext.configure
 */
export interface IGPUCanvasContext
{
    /**
     * 画布id
     */
    canvasId: string;

    /**
     * 画布配置。
     */
    configuration?: IGPUCanvasConfiguration;
}
