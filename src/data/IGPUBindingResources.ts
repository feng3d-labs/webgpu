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

/**
 * 缓冲区绑定。
 *
 * @see GPUBufferBinding
 */
export interface IGPUBufferBinding
{
    [name: string]: ArrayBufferView | ArrayLike<number> | number;

    /**
     * 如果未设置将通过反射信息自动生成。
     */
    bufferView?: ArrayBufferView;
}

/**
 * 外部纹理。
 *
 * @see GPUExternalTexture
 * @see GPUExternalTextureDescriptor
 * @see GPUDevice.importExternalTexture
 */
export interface IGPUExternalTexture extends GPUExternalTextureDescriptor
{
}
