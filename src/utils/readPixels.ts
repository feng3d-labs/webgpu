import { Texture } from "@feng3d/render-api";
import { getGPUTextureFormat } from "../caches/getGPUTextureFormat";

/**
 * 从 GPU纹理 上读取数据。
 *
 * @param device GPU设备。
 * @param texture GPU纹理
 * @param x 纹理读取X坐标。
 * @param y 纹理读取Y坐标。
 * @param width 纹理读取宽度。
 * @param height 纹理读取高度。
 *
 * @returns 读取到的数据。
 */
export async function readPixels(device: GPUDevice, params: { texture: GPUTexture, origin: [x: number, y: number], copySize: [width: number, height: number] })
{
    const commandEncoder = device.createCommandEncoder();

    const { texture, origin, copySize } = params;
    const [width, height] = copySize;

    const bytesPerPixel = Texture.getTextureBytesPerPixel(texture.format);
    const Cls = Texture.getTextureDataConstructor(texture.format);

    const bytesPerRow = width * bytesPerPixel;
    const bufferSize = bytesPerRow * height;
    const bufferData = new Cls(bufferSize / Cls.BYTES_PER_ELEMENT);

    //
    const buffer = device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });

    commandEncoder.copyTextureToBuffer(
        {
            texture,
            origin,
        },
        {
            buffer,
            offset: 0,
            bytesPerRow,
        },
        copySize
    );

    device.queue.submit([commandEncoder.finish()]);

    await buffer.mapAsync(GPUMapMode.READ);

    const source = new Uint8Array(buffer.getMappedRange());

    bufferData.set(source);

    buffer.destroy();

    return bufferData;
}
