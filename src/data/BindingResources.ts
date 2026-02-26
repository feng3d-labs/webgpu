import { BufferBinding } from './BufferBinding';

/**
 * 绑定资源。
 *
 * 与着色器中名称对应的绑定资源（纹理、采样器、统一数据、存储数据等）。
 */
export interface BindingResources
{
    readonly [key: string]: BindingResource;
}

/**
 * 绑定资源 类型
 */
export type BindingResource = BindingResourceTypeMap[keyof BindingResourceTypeMap];

export interface BindingResourceTypeMap
{
    /**
     * 缓冲区绑定。
     */
    BufferBinding: BufferBinding;
}
