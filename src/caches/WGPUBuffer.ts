import { reactive } from '@feng3d/reactivity';
import { Buffer, ChainMap, TypedArray } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';

/**
 * WebGPU缓冲区管理器。
 * 负责管理GPU缓冲区的创建、数据写入和生命周期管理。
 * 使用响应式系统自动处理缓冲区更新和数据同步。
 */
export class WGPUBuffer extends ReactiveObject
{
    /** GPU缓冲区实例 */
    readonly gpuBuffer: GPUBuffer;

    /**
     * 构造函数
     * @param _device GPU设备实例
     * @param _buffer 缓冲区配置对象
     */
    constructor(private _device: GPUDevice, private _buffer: Buffer)
    {
        super();

        this._createGPUBuffer();
        this._onWriteBuffers();
    }

    /**
     * 创建GPU缓冲区
     * 使用响应式系统监听缓冲区配置变化，自动重新创建GPU缓冲区
     */
    private _createGPUBuffer()
    {
        const device = this._device;
        const buffer = this._buffer;

        const r_this = reactive(this);
        const r_buffer = reactive(buffer);

        // 监听缓冲区配置变化，自动重新创建GPU缓冲区
        this.effect(() =>
        {
            // 触发响应式依赖
            r_buffer.label;
            r_buffer.size;
            r_buffer.usage;
            r_buffer.data;

            const { label, size, usage, data } = this._buffer;

            // 验证缓冲区尺寸必须为4的倍数（WebGPU要求）
            console.assert(size && (size % 4 === 0), `初始化缓冲区时必须设置缓冲区尺寸且必须为4的倍数！`);

            // 如果初始化时存在数据，则使用mappedAtCreation方式上传数据
            const mappedAtCreation = data !== undefined;

            // 创建GPU缓冲区
            const gpuBuffer = device.createBuffer({
                label,
                size,
                usage: usage ?? WGPUBuffer.defaultGPUBufferUsage,
                mappedAtCreation
            });

            // 如果初始化时存在数据，使用map方式上传数据
            if (mappedAtCreation)
            {
                // 将数据转换为Int8Array格式
                const int8Array = ArrayBuffer.isView(data) ? new Int8Array(data.buffer) : new Int8Array(data);

                // 将数据写入映射的内存区域
                new Int8Array(gpuBuffer.getMappedRange()).set(int8Array);

                // 取消映射，使数据生效
                gpuBuffer.unmap();
            }

            // 更新GPU缓冲区引用
            r_this.gpuBuffer = gpuBuffer;
        });

        // 管理GPU缓冲区的生命周期，自动销毁旧的缓冲区
        let oldGPUBuffer: GPUBuffer;
        this.effect(() =>
        {
            // 触发响应式依赖
            r_this.gpuBuffer;

            // 销毁旧的GPU缓冲区
            oldGPUBuffer?.destroy();
            oldGPUBuffer = this.gpuBuffer;
        });

        // 注册销毁回调，确保在对象销毁时清理GPU缓冲区
        this._destroyItems.push(() =>
        {
            r_this.gpuBuffer = null;
        });
    }

    /**
     * 设置缓冲区数据写入监听
     * 监听writeBuffers变化，自动将数据写入GPU缓冲区
     */
    private _onWriteBuffers()
    {
        const buffer = this._buffer;
        const device = this._device;

        const r_buffer = reactive(buffer);
        const r_this = reactive(this);

        // 监听数据写入请求
        this.effect(() =>
        {
            // 触发响应式依赖，监听writeBuffers数组变化
            r_buffer.writeBuffers?.forEach(() => { });
            r_this.gpuBuffer;

            const gpuBuffer = this.gpuBuffer;

            // 如果GPU缓冲区不存在或没有写入数据，则跳过
            if (!gpuBuffer || !buffer.writeBuffers) return;

            // 处理每个数据写入请求
            buffer.writeBuffers.forEach((writeBuffer) =>
            {
                const bufferOffset = writeBuffer.bufferOffset ?? 0;  // 缓冲区偏移量
                const data = writeBuffer.data;                       // 要写入的数据
                const dataOffset = writeBuffer.dataOffset ?? 0;      // 数据偏移量
                const size = writeBuffer.size;                       // 写入大小

                let arrayBuffer: ArrayBuffer;
                let dataOffsetByte: number;
                let sizeByte: number;

                // 处理TypedArray类型的数据
                if (ArrayBuffer.isView(data))
                {
                    const bytesPerElement = (data as Uint8Array).BYTES_PER_ELEMENT;

                    arrayBuffer = data.buffer;
                    dataOffsetByte = data.byteOffset + bytesPerElement * dataOffset;
                    sizeByte = size ? (bytesPerElement * size) : data.byteLength;
                }
                // 处理ArrayBuffer类型的数据
                else
                {
                    arrayBuffer = data;
                    dataOffsetByte = dataOffset ?? 0;
                    sizeByte = size ?? (data.byteLength - dataOffsetByte);
                }

                // 验证数据范围，防止越界
                console.assert(sizeByte <= arrayBuffer.byteLength - dataOffsetByte, `上传的尺寸超出数据范围！`);

                // 验证写入数据长度必须为4的倍数（WebGPU要求）
                console.assert(sizeByte % 4 === 0, `写入数据长度不是4的倍数！`);

                // 将数据写入GPU缓冲区
                device.queue.writeBuffer(
                    gpuBuffer,
                    bufferOffset,
                    arrayBuffer,
                    dataOffsetByte,
                    sizeByte,
                );
            });

            // 清空写入数据，避免重复处理
            r_buffer.writeBuffers = null;
        });
    }

    /**
     * 默认GPU缓冲区使用标志
     * 包含除CPU与GPU数据交换外的所有常用缓冲区用途
     * 注意：不包含MAP_READ和MAP_WRITE，这些需要特殊处理
     */
    static readonly defaultGPUBufferUsage = 0
        // | GPUBufferUsage.MAP_READ      // CPU读取GPU数据
        // | GPUBufferUsage.MAP_WRITE     // CPU写入GPU数据
        | GPUBufferUsage.COPY_SRC        // 作为复制源
        | GPUBufferUsage.COPY_DST        // 作为复制目标
        | GPUBufferUsage.INDEX           // 索引缓冲区
        | GPUBufferUsage.VERTEX          // 顶点缓冲区
        | GPUBufferUsage.UNIFORM         // 统一缓冲区
        | GPUBufferUsage.STORAGE         // 存储缓冲区
        | GPUBufferUsage.INDIRECT        // 间接绘制缓冲区
        | GPUBufferUsage.QUERY_RESOLVE   // 查询解析缓冲区
        ;

    /**
     * 从TypedArray创建或获取缓冲区配置
     * 自动处理缓冲区大小对齐（4字节对齐）
     * @param bufferSource 源数据数组
     * @returns 缓冲区配置对象
     */
    static getOrCreateBuffer(bufferSource: TypedArray)
    {
        let arrayBuffer = bufferSource as ArrayBuffer;

        // 如果是ArrayBufferView，获取其底层的ArrayBuffer
        if ((bufferSource as ArrayBufferView).buffer)
        {
            arrayBuffer = (bufferSource as ArrayBufferView).buffer;
        }

        // 检查是否已存在对应的缓冲区配置
        let buffer = this.bufferMap.get(arrayBuffer);

        if (buffer) return buffer;

        // 创建新的缓冲区配置，确保大小为4的倍数
        buffer = {
            size: Math.ceil(arrayBuffer.byteLength / 4) * 4,
            data: bufferSource,
        };
        this.bufferMap.set(arrayBuffer, buffer);

        return buffer;
    }

    /** 缓冲区配置缓存映射表 */
    private static readonly bufferMap = new WeakMap<ArrayBuffer, Buffer>();

    /**
     * 获取或创建WGPUBuffer实例
     * 使用设备+缓冲区的组合作为缓存键，避免重复创建
     * @param device GPU设备实例
     * @param buffer 缓冲区配置对象
     * @returns WGPUBuffer实例
     */
    static getOrCreateWGPUBuffer(device: GPUDevice, buffer: Buffer)
    {
        // 尝试从缓存中获取现有实例
        let result = WGPUBuffer.getGPUBufferMap.get([device, buffer]);

        if (result) return result;

        // 创建新实例并缓存
        result = new WGPUBuffer(device, buffer);

        WGPUBuffer.getGPUBufferMap.set([device, buffer], result);

        return result;
    }

    /** GPU缓冲区实例缓存映射表 */
    private static readonly getGPUBufferMap = new ChainMap<[device: GPUDevice, buffer: Buffer], WGPUBuffer>();
}
