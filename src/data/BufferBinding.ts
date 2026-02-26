import { TypedArray } from '../types/TypedArray';

/**
 * 缓冲区绑定。
 *
 * WebGL 统一块(Uniform Block) 数据
 * WebGPU 缓冲区绑定（GPUBufferBinding）
 *
 * @see GPUBufferBinding
 */
export interface BufferBinding
{
    readonly value?: BufferBindingItem;

    /**
     * 如果未设置引擎将自动生成。
     */
    readonly bufferView?: TypedArray;
}

export type UniformDataItem = number | readonly number[] | readonly number[][] | TypedArray | readonly TypedArray[]
    | { toArray(): number[] | TypedArray }
    | readonly { toArray(): number[] | TypedArray }[]
    ;
export type BufferBindingItem = UniformDataItem | { readonly [key: string]: BufferBindingItem };
