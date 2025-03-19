import { ChainMap, computed, ComputedRef, effect, GBuffer, reactive, UnReadonly } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";

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
export function getGPUBuffer(device: GPUDevice, buffer: GBuffer)
{
    const getGPUBufferKey: GetGPUBufferKey = [device, buffer];
    let result = getGPUBufferMap.get(getGPUBufferKey);
    if (result) return result.value;

    const size = buffer.size;
    console.assert(size && (size % 4 === 0), `初始化缓冲区时必须设置缓冲区尺寸且必须为4的倍数！`);

    (buffer as UnReadonly<GBuffer>).usage = buffer.usage ?? defaultGPUBufferUsage;

    const label = buffer.label;
    const usage = buffer.usage;

    // 初始化时存在数据，则使用map方式上传第一次数据。
    const mappedAtCreation = buffer.data !== undefined;

    const gBuffer = device.createBuffer({ label, size, usage, mappedAtCreation });

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
        if (!buffer.writeBuffers) return;
        buffer.writeBuffers.forEach((writeBuffer) =>
        {
            const bufferOffset = writeBuffer.bufferOffset ?? 0;
            const data = writeBuffer.data;
            const dataOffset = writeBuffer.dataOffset ?? 0;
            const size = writeBuffer.size;

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
        rb.writeBuffers = null;
    };

    const rb = reactive(buffer);
    // 处理数据写入GPU缓冲
    result = computed(() =>
    {
        // 监听
        rb.writeBuffers?.forEach(() => { });

        // 执行
        writeBuffer();

        return gBuffer;
    });

    // 这行是不是可以删掉？
    effect(() =>
    {
        result.value;
    })

    const dataChange = () =>
    {
        const writeBuffers = buffer.writeBuffers || [];
        writeBuffers.push({ data: buffer.data });
        rb.writeBuffers = writeBuffers;
    };

    watcher.watch(buffer, "data", dataChange);

    //
    ((oldDestroy) =>
    {
        gBuffer.destroy = () =>
        {
            oldDestroy.apply(gBuffer);

            getGPUBufferMap.delete(getGPUBufferKey);

            //
            watcher.unwatch(buffer, "data", dataChange);
        };
    })(gBuffer.destroy);

    getGPUBufferMap.set(getGPUBufferKey, result);

    return result.value;
}
type GetGPUBufferKey = [device: GPUDevice, buffer: GBuffer];
const getGPUBufferMap = new ChainMap<GetGPUBufferKey, ComputedRef<GPUBuffer>>;