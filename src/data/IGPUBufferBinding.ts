import { TypedArray } from "@feng3d/render-api";

/**
 * 缓冲区绑定。
 *
 * @see GPUBufferBinding
 */
export interface IGPUBufferBinding
{
    [name: string]: IBufferBindingItem;

    /**
     * 如果未设置引擎将自动生成。
     */
    readonly bufferView?: TypedArray;
}

export type IUniformDataItem = number | number[] | number[][] | TypedArray | TypedArray[];
export type IBufferBindingItem = IUniformDataItem | { [key: string]: IBufferBindingItem };