import { reactive } from '@feng3d/reactivity';
import { Buffer } from '@feng3d/render-api';
import { ReactiveObject } from '../ReactiveObject';

/**
 * WebGPU缓冲区管理器
 *
 * 负责管理GPU缓冲区的创建、数据写入和生命周期管理。
 * 使用响应式系统自动处理缓冲区更新和数据同步。
 */
export class WGPUBuffer extends ReactiveObject
{
    /** GPU缓冲区实例 */
    readonly gpuBuffer: GPUBuffer;

    /**
     * 构造函数
     *
     * @param device GPU设备实例
     * @param buffer 缓冲区配置对象
     */
    constructor(device: GPUDevice, buffer: Buffer)
    {
        super();

        this._createGPUBuffer(device, buffer);
        this._onWriteBuffers(device, buffer);

        // 将实例注册到设备缓存中
        this._onMap(device, buffer);
    }

    private _onMap(device: GPUDevice, buffer: Buffer)
    {
        device.buffers ??= new WeakMap<Buffer, WGPUBuffer>();
        device.buffers.set(buffer, this);
        this.destroyCall(() => { device.buffers.delete(buffer); });
    }

    /**
     * 创建GPU缓冲区
     *
     * 使用响应式系统监听缓冲区配置变化，自动重新创建GPU缓冲区。
     */
    private _createGPUBuffer(device: GPUDevice, buffer: Buffer)
    {
        const r_this = reactive(this);
        const r_buffer = reactive(buffer);

        let gpuBuffer: GPUBuffer;

        const destroy = () =>
        {
            r_this.gpuBuffer?.destroy();
            r_this.gpuBuffer = null;
        }

        // 监听缓冲区配置变化，自动重新创建GPU缓冲区
        this.effect(() =>
        {
            // 销毁旧的GPU缓冲区
            gpuBuffer?.destroy();
            gpuBuffer = null;

            // 触发响应式依赖
            r_buffer.label;
            r_buffer.size;
            r_buffer.usage;
            r_buffer.data;

            const { label, size, usage, data } = buffer;

            // 验证缓冲区尺寸必须为4的倍数（WebGPU要求）
            console.assert(size && (size % 4 === 0), `初始化缓冲区时必须设置缓冲区尺寸且必须为4的倍数！`);

            // 如果初始化时存在数据，则使用mappedAtCreation方式上传数据
            const mappedAtCreation = data !== undefined;

            // 创建GPU缓冲区
            gpuBuffer = device.createBuffer({
                label,
                size,
                usage: usage ?? WGPUBuffer.defaultGPUBufferUsage,
                mappedAtCreation,
            });

            // 如果初始化时存在数据，使用map方式上传数据
            if (mappedAtCreation)
            {
                // 将数据写入映射的内存区域
                new Int8Array(gpuBuffer.getMappedRange()).set(new Int8Array(data));

                // 取消映射，使数据生效
                gpuBuffer.unmap();
            }

            // 更新GPU缓冲区引用
            r_this.gpuBuffer = gpuBuffer;
        });

        // 注册销毁回调，确保在对象销毁时清理GPU缓冲区
        this.destroyCall(destroy);
    }

    /**
     * 设置缓冲区数据写入监听
     *
     * 监听writeBuffers变化，自动将数据写入GPU缓冲区。
     */
    private _onWriteBuffers(device: GPUDevice, buffer: Buffer)
    {
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

                let arrayBuffer: ArrayBuffer | SharedArrayBuffer;
                let dataOffsetByte: number;
                let sizeByte: number;

                // 处理TypedArray类型的数据
                if (ArrayBuffer.isView(data))
                {
                    const bytesPerElement = data.BYTES_PER_ELEMENT;

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
     *
     * 包含除CPU与GPU数据交换外的所有常用缓冲区用途。
     * 注意：不包含MAP_READ和MAP_WRITE，这些需要特殊处理。
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
     * 获取或创建WGPUBuffer实例
     *
     * 使用设备+缓冲区的组合作为缓存键，避免重复创建。
     *
     * @param device GPU设备实例
     * @param buffer 缓冲区配置对象
     * @returns WGPUBuffer实例
     */
    static getInstance(device: GPUDevice, buffer: Buffer)
    {
        return device.buffers?.get(buffer) || new WGPUBuffer(device, buffer);
    }
}

declare global
{
    interface GPUDevice
    {
        /** 缓冲区实例缓存映射表 */
        buffers: WeakMap<Buffer, WGPUBuffer>;
    }
}
