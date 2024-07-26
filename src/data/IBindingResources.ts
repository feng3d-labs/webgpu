import { IGPUBufferBinding, IGPUExternalTexture } from "./IGPUBindGroup";
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
    | IGPUSampler
    | IGPUTextureView
    | IGPUBufferBinding
    | IGPUExternalTexture
    ;

