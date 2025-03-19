import { ChainMap, computed, ComputedRef, reactive, Texture, TextureDataSource, TextureDimension, TextureImageSource, TextureLike, TextureSource } from "@feng3d/render-api";
import { webgpuEvents } from "../eventnames";
import { MultisampleTexture } from "../internal/MultisampleTexture";
import { generateMipmap } from "../utils/generate-mipmap";
import { getGPUCanvasContext } from "./getGPUCanvasContext";
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
    const getGPUTextureKey: GetGPUTextureMap = [device, textureLike];
    let result = getGPUTextureMap.get(getGPUTextureKey);
    if (result) return result.value;

    if (!autoCreate) return null;

    result = computed(() =>
    {
        if ("context" in textureLike)
        {
            // 
            reactive(webgpuEvents).preSubmit;

            const canvasTexture = textureLike;
            const context = getGPUCanvasContext(device, canvasTexture.context);

            const gpuTexture = context.getCurrentTexture();

            return gpuTexture;
        }

        const texture = textureLike as MultisampleTexture;

        // 监听
        const r_texture = reactive(texture);
        r_texture.format;
        r_texture.sampleCount;
        r_texture.dimension;
        r_texture.viewFormats;
        r_texture.generateMipmap;
        r_texture.mipLevelCount;
        r_texture.size[0];
        r_texture.size[1];
        r_texture.size[2];

        // 执行
        const { format, sampleCount, dimension, viewFormats } = texture;
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
        mipLevelCount = mipLevelCount ?? 1;

        if (label === undefined)
        {
            label = `GPUTexture ${autoIndex++}`;
        }

        const textureDimension = getGPUTextureDimension(dimension);

        // 创建纹理
        const gpuTexture = device.createTexture({
            label,
            size,
            mipLevelCount,
            sampleCount,
            dimension: textureDimension,
            format,
            usage,
            viewFormats,
        });
        textureMap.get([device, textureLike])?.destroy(); // 销毁旧的纹理
        textureMap.set([device, textureLike], gpuTexture);

        // 初始化纹理内容
        updateSources(texture);
        updateWriteTextures(device, gpuTexture, texture);

        // 自动生成 mipmap。
        if (texture.generateMipmap)
        {
            generateMipmap(device, gpuTexture);
        }

        return gpuTexture;
    });
    getGPUTextureMap.set(getGPUTextureKey, result);

    return result.value;
}
let autoIndex = 0;
type GetGPUTextureMap = [device: GPUDevice, texture: TextureLike];
const getGPUTextureMap = new ChainMap<GetGPUTextureMap, ComputedRef<GPUTexture>>;

const textureMap = new ChainMap<[device: GPUDevice, texture: Texture], GPUTexture>();

/**
 * 更新纹理
 * @param texture 
 */
function updateSources(texture: Texture)
{
    computed(() =>
    {
        const r_texture = reactive(texture);
        r_texture.sources;

        if (!texture.sources) return;

        const writeTextures: TextureSource[] = [];
        texture.sources.forEach((v) =>
        {
            writeTextures.push(v);
        });
        reactive(texture).writeTextures = writeTextures.concat(texture.writeTextures || []);
    }).value;
};

function updateWriteTextures(device: GPUDevice, gpuTexture: GPUTexture, texture: Texture)
{
    computed(() =>
    {
        // 监听
        const r_texture = reactive(texture)
        r_texture.writeTextures

        // 执行
        if (!texture.writeTextures) return;

        const { writeTextures, format } = texture;
        reactive(texture).writeTextures = null;

        writeTextures.forEach((v) =>
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
            const bytesPerPixel = Texture.getTextureBytesPerPixel(format);

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
    }).value;
};

function getGPUTextureDimension(dimension: TextureDimension)
{
    const textureDimension = dimensionMap[dimension];

    return textureDimension;
}

const dimensionMap: Record<TextureDimension, GPUTextureDimension> = {
    "1d": "1d",
    "2d": "2d",
    "2d-array": "2d",
    cube: "2d",
    "cube-array": "3d",
    "3d": "3d",
};
