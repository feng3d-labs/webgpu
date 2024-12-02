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
export async function readPixels(device: GPUDevice, params: { texture: GPUTexture, origin: GPUOrigin3D, copySize: { width: number, height: number } })
{
    const commandEncoder = device.createCommandEncoder();

    const { texture, origin, copySize } = params;
    const { width, height } = copySize;

    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
    const bufferSize = bytesPerRow * height;

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
    const bufferData = new Uint8Array(buffer.size);

    const source = new Uint8Array(buffer.getMappedRange());

    bufferData.set(source);
    buffer.unmap();

    buffer.destroy();

    const result = new Uint8Array(width * height * 4);

    for (let i = 0; i < width; i++)
    {
        for (let j = 0; j < height; j++)
        {
            // rgba8unorm
            let rgba = [
                bufferData[j * bytesPerRow + i * 4],
                bufferData[j * bytesPerRow + i * 4 + 1],
                bufferData[j * bytesPerRow + i * 4 + 2],
                bufferData[j * bytesPerRow + i * 4 + 3],
            ];

            if (texture.format === "bgra8unorm")
            {
                rgba = [rgba[2], rgba[1], rgba[0], rgba[3]];
            }

            result[j * width * 4 + i * 4] = rgba[0];
            result[j * width * 4 + i * 4 + 1] = rgba[1];
            result[j * width * 4 + i * 4 + 2] = rgba[2];
            result[j * width * 4 + i * 4 + 3] = rgba[3];
        }
    }

    return result;
}
