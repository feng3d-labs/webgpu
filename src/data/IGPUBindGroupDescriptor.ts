import { IGPUBuffer } from "./IGPUBuffer";
import { IGPUSampler } from "./IGPUSampler";
import { IGPUTextureView } from "./IGPUTextureView";

/**
 * GPU 绑定组。
 *
 * @see GPUBindGroupDescriptor
 * @see GPUDevice.createBindGroup
 */
export interface IGPUBindGroupDescriptor extends Omit<GPUBindGroupDescriptor, "layout" | "entries">
{
    /**
     * The {@link IGPUBindGroupLayoutDescriptor} the entries of this bind group will conform to.
     */
    layout: GPUBindGroupLayoutDescriptor;

    /**
     * A list of entries describing the resources to expose to the shader for each binding
     * described by the {@link GPUBindGroupDescriptor#layout}.
     *
     * {@link GPUBindGroupEntry}
     */
    entries: IGPUBindGroupEntry[];
}

/**
 * 绑定资源入口，指定资源绑定的位置。
 *
 * @see GPUBindGroupEntry
 */
export interface IGPUBindGroupEntry extends Omit<GPUBindGroupEntry, "resource">
{
    /**
     * The resource to bind, which may be a {@link GPUSampler}, {@link GPUTextureView},
     * {@link GPUExternalTexture}, or {@link GPUBufferBinding}.
     */
    resource: IGPUBindingResource;
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
export interface IGPUBufferBinding extends Omit<GPUBufferBinding, "buffer">
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
