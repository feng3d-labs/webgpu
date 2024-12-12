import { ITextureView } from "@feng3d/render-api";
import { IGPUBufferBinding } from "./IGPUBufferBinding";
import { IGPUExternalTexture } from "./IGPUExternalTexture";
import { IGPUSampler } from "./IGPUSampler";

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
    | ITextureView
    | IGPUBufferBinding
    | IGPUExternalTexture
    ;
