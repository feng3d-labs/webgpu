import { IGPUBufferBinding } from "./IGPUBufferBinding";
import { IGPUExternalTexture } from "./IGPUExternalTexture";
import { IGPUSampler } from "./IGPUSampler";
import { IGPUTextureView } from "./IGPUTextureView";

/**
 * GPU绑定的资源映射。
 */
export interface IGPUBindingResources
{
    [name: string]: IGPUBindingResource
}

/**
 * 绑定资源。
 *
 * @see GPUBindingResource
 */
export type IGPUBindingResource =
    | IGPUSampler
    | IGPUTextureView
    | IGPUBufferBinding
    | IGPUExternalTexture
    ;
