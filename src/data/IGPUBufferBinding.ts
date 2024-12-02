/**
 * 缓冲区绑定。
 *
 * @see GPUBufferBinding
 */
export interface IGPUBufferBinding
{
    [name: string]: ArrayBufferView | ArrayLike<number> | number;

    /**
     * 如果未设置引擎将自动生成。
     */
    readonly bufferView?: ArrayBufferView;
}
