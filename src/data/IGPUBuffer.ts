/**
 * GPU缓冲区。
 *
 * {@link GPUBufferDescriptor}
 * {@link GPUBuffer}
 */
export interface IGPUBuffer extends Omit<GPUBufferDescriptor, "mappedAtCreation">
{
    /**
     * 缓冲初始数据，只上传一次GPU。
     *
     * 当值不为空时，将使用 {@link GPUBufferDescriptor.mappedAtCreation} 方式上传数据。
     */
    data?: BufferSource;

    /**
     * 当该缓冲初始化时，将使用 GPUQueue.writeBuffer 写入数据。
     * 初始化后每次变更时将使用 GPUQueue.writeBuffer 写入数据。
     *
     * {@link GPUQueue.writeBuffer}
     */
    writeBuffers?: IGPUWriteBuffer[];
}

/**
 * GPU写缓冲区时包含数据。
 *
 * {@link GPUQueue.writeBuffer}
 */
export interface IGPUWriteBuffer
{
    /**
     * Offset in bytes into `buffer` to begin writing at.
     */
    bufferOffset?: number;

    /**
     * Data to write into `buffer`.
     */
    data: SharedArrayBuffer | BufferSource,

    /**
     * Offset in into `data` to begin writing from. Given in elements if `data` is a `TypedArray` and bytes otherwise.
     */
    dataOffset?: number,

    /**
     * Size of content to write from `data` to `buffer`. Given in elements if `data` is a `TypedArray` and bytes otherwise.
     */
    size?: number,
}
