import { reactive } from '@feng3d/reactivity';
import { Buffer, ChainMap, TypedArray } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';

/**
 * GPU缓冲区管理器。
 */
export class WGPUBuffer extends ReactiveObject
{
    get gpuBuffer()
    {
        if (!this._gpuBuffer)
        {
            this._gpuBuffer = WGPUBuffer.createGPUBuffer(this._device, this._buffer);
        }
        return this._gpuBuffer;
    }
    private _gpuBuffer: GPUBuffer;

    private readonly _device: GPUDevice;
    private readonly _buffer: Buffer;

    constructor(device: GPUDevice, buffer: Buffer)
    {
        super();
        this._device = device;
        this._buffer = buffer;

        this._updateWriteBuffers();
        this._onSizeChange();
        this._onDataChange();
        this._onUsageChange();
    }

    private _updateWriteBuffers()
    {
        const buffer = this._buffer;
        const device = this._device;

        const r_buffer = reactive(buffer);
        const r_this = reactive(this);

        // 写入数据
        this.effect(() =>
        {
            // 监听
            r_buffer.writeBuffers?.forEach(() => { });
            r_this.gpuBuffer;

            const gpuBuffer = this.gpuBuffer;

            if (!gpuBuffer) return;

            // 处理数据写入GPU缓冲
            buffer.writeBuffers?.forEach((writeBuffer) =>
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
                    gpuBuffer,
                    bufferOffset,
                    arrayBuffer,
                    dataOffsetByte,
                    sizeByte,
                );
            });

            // 清空写入数据
            r_buffer.writeBuffers = null;
        });
    }

    private _onSizeChange()
    {
        const buffer = this._buffer;
        const r_buffer = reactive(buffer);

        this.effect(() =>
        {
            r_buffer.size;

            if (this.gpuBuffer)
            {
                console.warn(`初始化GPUBuffer后将无法修改尺寸！`);
            }
        });
    }

    private _onDataChange()
    {
        const buffer = this._buffer;
        const r_buffer = reactive(buffer);

        this.effect(() =>
        {
            r_buffer.data;

            if (this.gpuBuffer)
            {
                console.warn(`初始化GPUBuffer后将无法直接修改数据，只能通过 {@link writeBuffers} 修改！`);
            }
        });
    }

    private _onUsageChange()
    {
        const buffer = this._buffer;
        const r_buffer = reactive(buffer);

        this.effect(() =>
        {
            r_buffer.usage;

            if (this.gpuBuffer)
            {
                console.warn(`初始化GPUBuffer后将无法修改允许缓冲区使用的用途！`);
            }
        });
    }

    /**
     * 除了GPU与CPU数据交换的`MAP_READ`与`MAP_WRITE`除外。
     */
    private static readonly defaultGPUBufferUsage = 0
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

    static getBuffer(bufferSource: TypedArray)
    {
        let arrayBuffer = bufferSource as ArrayBuffer;

        if ((bufferSource as ArrayBufferView).buffer)
        {
            arrayBuffer = (bufferSource as ArrayBufferView).buffer;
        }

        let buffer = this.bufferMap.get(arrayBuffer);

        if (buffer) return buffer;

        buffer = {
            size: Math.ceil(arrayBuffer.byteLength / 4) * 4,
            data: bufferSource,
        };
        this.bufferMap.set(arrayBuffer, buffer);

        return buffer;
    }

    private static readonly bufferMap = new WeakMap<ArrayBuffer, Buffer>();

    /**
     * 获取 GPU 缓冲。
     *
     * @param device
     * @param buffer
     * @returns
     */
    static getInstance(device: GPUDevice, buffer: Buffer)
    {
        let result = WGPUBuffer.getGPUBufferMap.get([device, buffer]);

        if (result) return result;

        result = new WGPUBuffer(device, buffer);

        WGPUBuffer.getGPUBufferMap.set([device, buffer], result);

        return result;
    }

    private static readonly getGPUBufferMap = new ChainMap<[device: GPUDevice, buffer: Buffer], WGPUBuffer>();

    static createGPUBuffer(device: GPUDevice, buffer: Buffer)
    {
        const { label, size, usage } = buffer;

        console.assert(size && (size % 4 === 0), `初始化缓冲区时必须设置缓冲区尺寸且必须为4的倍数！`);

        // 初始化时存在数据，则使用map方式上传第一次数据。
        const mappedAtCreation = buffer.data !== undefined;

        const gpuBuffer = device.createBuffer({ label, size, usage: usage ?? WGPUBuffer.defaultGPUBufferUsage, mappedAtCreation });

        // 初始化时存在数据，则使用map方式上传第一次数据。
        if (mappedAtCreation)
        {
            const bufferData = buffer.data;

            const int8Array = ArrayBuffer.isView(bufferData) ? new Int8Array(bufferData.buffer) : new Int8Array(bufferData);

            new Int8Array(gpuBuffer.getMappedRange()).set(int8Array);

            gpuBuffer.unmap();
        }

        return gpuBuffer;
    }

}
