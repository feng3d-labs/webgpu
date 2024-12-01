import { watcher } from "@feng3d/watcher";
import { IGPUBuffer } from "../data/IGPUBuffer";

/**
 * 除了GPU与CPU数据交换的`MAP_READ`与`MAP_WRITE`除外。
 */
const defaultGPUBufferUsage = 0
    // | GPUBufferUsage.MAP_READ
    // | GPUBufferUsage.MAP_WRITE
    | GPUBufferUsage.COPY_SRC
    | GPUBufferUsage.COPY_DST
    | GPUBufferUsage.INDEX
    | GPUBufferUsage.VERTEX
    | GPUBufferUsage.UNIFORM
    | GPUBufferUsage.STORAGE
    | GPUBufferUsage.INDIRECT
    | GPUBufferUsage.QUERY_RESOLVE
    ;

/**
 * 获取 GPU 缓冲。
 *
 * @param device
 * @param buffer
 * @returns
 */
export function getGPUBuffer(device: GPUDevice, buffer: IGPUBuffer)
{
    const gBufferMap: WeakMap<IGPUBuffer, GPUBuffer> = device["_gBufferMap"] = device["_gBufferMap"] || new WeakMap<IGPUBuffer, GPUBuffer>();

    let gBuffer: GPUBuffer = gBufferMap.get(buffer);
    if (gBuffer) return gBuffer;

    let size = buffer.size;
    if (buffer.size === undefined)
    {
        const bufferData = buffer.data;
        console.assert(!!bufferData, `初始化缓冲区时，当尺寸未定义时，必须设置data属性来计算尺寸。`);


        size = bufferData.byteLength;
    }
    // GPU缓冲区尺寸应该为4的倍数。
    size = Math.ceil(buffer.size / 4) * 4;
    (buffer as any).size = size;

    (buffer as any).usage = buffer.usage ?? defaultGPUBufferUsage;

    const label = buffer.label;
    const usage = buffer.usage;

    // 初始化时存在数据，则使用map方式上传第一次数据。
    const mappedAtCreation = buffer.data !== undefined;

    gBuffer = device.createBuffer({ label, size, usage, mappedAtCreation });

    if (mappedAtCreation)
    {
        const bufferData = buffer.data;
        if (ArrayBuffer.isView(bufferData))
        {
            new Int8Array(gBuffer.getMappedRange()).set(new Int8Array(bufferData.buffer));
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
                    sizeByte = size ?? (data.byteLength - dataOffsetByte);
                }

                // 防止给出数据不够的情况
                console.assert(sizeByte <= arrayBuffer.byteLength - dataOffsetByte, `上传的尺寸超出数据范围！`);

                console.assert(sizeByte % 4 === 0, `写入数据长度不是4的倍数！`);

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

    watcher.watch(buffer, "writeBuffers", writeBuffer);

    const dataChange = () =>
    {
        const writeBuffers = buffer.writeBuffers || [];
        writeBuffers.push({ data: buffer.data });
        buffer.writeBuffers = writeBuffers;
    };

    watcher.watch(buffer, "data", dataChange);

    //
    ((oldDestroy) =>
    {
        gBuffer.destroy = () =>
        {
            oldDestroy.apply(gBuffer);

            gBufferMap.delete(buffer);

            //
            watcher.unwatch(buffer, "writeBuffers", writeBuffer);
            watcher.unwatch(buffer, "data", dataChange);
        };
    })(gBuffer.destroy);

    gBufferMap.set(buffer, gBuffer);

    return gBuffer;
}
