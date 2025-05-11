import { computed, Computed, effect, reactive } from "@feng3d/reactivity";
import { ChainMap, Buffer } from "@feng3d/render-api";

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

export class GPUBufferManager
{
    /**
     * 获取 GPU 缓冲。
     *
     * @param device
     * @param buffer
     * @returns
     */
    static getGPUBuffer(device: GPUDevice, buffer: Buffer)
    {
        const getGPUBufferKey: GetGPUBufferKey = [device, buffer];
        let result = getGPUBufferMap.get(getGPUBufferKey);
        if (result) return result.value;

        let gpuBuffer: GPUBuffer;
        result = computed(() =>
        {
            // 监听
            const r_buffer = reactive(buffer);
            r_buffer.size;
            r_buffer.usage;

            // 执行
            const { label, size, usage } = buffer;
            console.assert(size && (size % 4 === 0), `初始化缓冲区时必须设置缓冲区尺寸且必须为4的倍数！`);

            // 初始化时存在数据，则使用map方式上传第一次数据。
            const mappedAtCreation = buffer.data !== undefined;

            // 销毁旧的缓冲区
            if (gpuBuffer) gpuBuffer.destroy();
            gpuBuffer = device.createBuffer({ label, size, usage: usage ?? defaultGPUBufferUsage, mappedAtCreation });

            // 初始化时存在数据，则使用map方式上传第一次数据。
            if (mappedAtCreation)
            {
                const bufferData = buffer.data;
                if (ArrayBuffer.isView(bufferData))
                {
                    new Int8Array(gpuBuffer.getMappedRange()).set(new Int8Array(bufferData.buffer));
                }
                else
                {
                    new Int8Array(gpuBuffer.getMappedRange()).set(new Int8Array(bufferData));
                }

                gpuBuffer.unmap();
            }

            // 更新数据
            dataChange(buffer);

            // 写入数据
            writeBuffer(device, buffer, gpuBuffer);

            return gpuBuffer;
        });
        getGPUBufferMap.set(getGPUBufferKey, result);

        return result.value;
    }
}

type GetGPUBufferKey = [device: GPUDevice, buffer: Buffer];
const getGPUBufferMap = new ChainMap<GetGPUBufferKey, Computed<GPUBuffer>>();

function dataChange(buffer: Buffer)
{
    let isInitData = true;
    computed(() =>
    {
        // 监听数据变化
        const rb = reactive(buffer);
        rb.data;

        // 第一次初始存在数据，则不再处理。
        if (isInitData)
        {
            isInitData = false;

            return;
        }

        // 处理数据写入GPU缓冲
        const { data } = buffer;
        const writeBuffers = buffer.writeBuffers || [];
        writeBuffers.push({ data });

        // 触发下次写入数据
        rb.writeBuffers = writeBuffers;
    }).value;
}

function writeBuffer(device: GPUDevice, buffer: Buffer, gBuffer: GPUBuffer)
{
    return effect(() =>
    {
        // 监听
        const rb = reactive(buffer);
        rb.writeBuffers?.forEach(() => { });

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

        // 清空写入数据
        rb.writeBuffers = null;
    });
}