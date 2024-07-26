import { watcher } from '@feng3d/watcher';
import { IGPUBuffer } from '../data/IGPUBuffer';

/**
 * 获取 GPU 缓冲。
 *
 * @param device
 * @param buffer
 * @returns
 */
export function getGPUBuffer(device: GPUDevice, buffer: IGPUBuffer)
{
    let gBuffer: GPUBuffer = gBufferMap.get(buffer);
    if (gBuffer) return gBuffer;

    const usage = buffer.usage;

    const size = Math.ceil(buffer.size / 4) * 4; // GPU缓冲区尺寸应该为4的倍数。

    // 初始化时存在数据，则使用map方式上传第一次数据。
    const mappedAtCreation = buffer.data !== undefined;

    gBuffer = device.createBuffer({ size, usage, mappedAtCreation });

    if (mappedAtCreation)
    {
        const bufferData = buffer.data;
        if (ArrayBuffer.isView(bufferData))
        {
            new (bufferData.constructor as any)(gBuffer.getMappedRange()).set(bufferData);
        }
        else
        {
            new Int8Array(gBuffer.getMappedRange()).set(new Int8Array(bufferData));
        }

        gBuffer.unmap();
    }

    const writeBuffer = () =>
    {
        // 处理数据写入GPU缓冲
        if (buffer.writeBuffers)
        {
            buffer.writeBuffers.forEach((v) =>
            {
                const bufferData = v;

                let bufferOffset = 0;
                let dataOffset = 0;
                bufferOffset = bufferData.bufferOffset ?? bufferOffset;
                const data = bufferData.data;
                dataOffset = bufferData.dataOffset ?? dataOffset;
                const size = bufferData.size;

                let arrayBuffer: ArrayBuffer;
                let dataOffsetByte: number;
                let sizeByte: number;
                if (ArrayBuffer.isView(data))
                {
                    const bytesPerElement = (data as Uint8Array).BYTES_PER_ELEMENT;

                    arrayBuffer = data.buffer;
                    dataOffsetByte = data.byteOffset + bytesPerElement * dataOffset;
                    sizeByte = size ? (bytesPerElement * size) : data.byteLength;
                }
                else
                {
                    arrayBuffer = data;
                    dataOffsetByte = dataOffset ?? 0;
                    sizeByte = size ?? data.byteLength;
                }

                // 防止给出数据不够的情况
                if (sizeByte > arrayBuffer.byteLength - dataOffsetByte)
                {
                    sizeByte = arrayBuffer.byteLength - dataOffsetByte;
                }

                // 处理写入数据长度不是4的倍数情况
                if (sizeByte % 4 !== 0)
                {
                    const oldUint8Array = new Uint8Array(arrayBuffer, dataOffsetByte, sizeByte);
                    // 创建4的倍数长度的数据
                    sizeByte = Math.ceil(sizeByte / 4) * 4;
                    dataOffsetByte = 0;
                    arrayBuffer = new ArrayBuffer(sizeByte);
                    new Uint8Array(arrayBuffer).set(oldUint8Array);
                }

                //
                device.queue.writeBuffer(
                    gBuffer,
                    bufferOffset,
                    arrayBuffer,
                    dataOffsetByte,
                    sizeByte,
                );
            });
            buffer.writeBuffers = null;
        }
    };
    writeBuffer();

    watcher.watch(buffer, 'writeBuffers', writeBuffer);

    const dataChange = () =>
    {
        const writeBuffers = buffer.writeBuffers || [];
        writeBuffers.push({ data: buffer.data });
        buffer.writeBuffers = writeBuffers;
    };

    watcher.watch(buffer, 'data', dataChange);

    //
    ((oldDestroy) =>
    {
        gBuffer.destroy = () =>
        {
            oldDestroy.apply(gBuffer);

            gBufferMap.delete(buffer);

            //
            watcher.unwatch(buffer, 'writeBuffers', writeBuffer);
            watcher.unwatch(buffer, 'data', dataChange);
        };
    })(gBuffer.destroy);

    gBufferMap.set(buffer, gBuffer);

    return gBuffer;
}

const gBufferMap = new WeakMap<IGPUBuffer, GPUBuffer>();
