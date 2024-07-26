import { IGPUBufferBinding, IGPUExternalTexture } from "./IGPUBindGroup";
import { IGPUBuffer } from "./IGPUBuffer";
import { IGPUSampler } from "./IGPUSampler";
import { IGPUTextureView } from "./IGPUTextureView";

/**
 * GPU绑定的资源映射。
 */
export interface IBindingResources
{
    [name: string]: IBindingResource
}

/**
 * GPU绑定的资源。
 *
 * @see GPUBindingResource
 */
export type IBindingResource =
    | ISampler
    | IGPUTextureView
    | IBufferBinding
    | IGPUExternalTexture
    ;

/**
 * 采样器资源。
 */
export interface ISampler extends IGPUSampler
{

}

/**
 * 缓冲区绑定资源。
 */
export interface IBufferBinding extends Omit<IGPUBufferBinding, "buffer">
{
    /**
     * 如果未设置将通过反射信息自动生成。
     */
    buffer?: IGPUBuffer;

    /**
     * 缓冲区数据映射。
     */
    map?: { [name: string]: ArrayLike<number> | number; }
}
