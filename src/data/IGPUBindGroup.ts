import { IGPUBuffer } from "./IGPUBuffer";
import { IGPUComputePipeline } from "./IGPUComputeObject";
import { IGPURenderPipeline } from "./IGPURenderObject";
import { IGPUSampler } from "./IGPUSampler";
import { IGPUTextureView } from "./IGPUTextureView";

/**
 * GPU 绑定组。
 *
 * @see GPUBindGroupDescriptor
 * @see GPUDevice.createBindGroup
 */
export interface IGPUBindGroup extends Omit<GPUBindGroupDescriptor, "layout" | "entries">
{
    /**
     * The {@link IGPUBindGroupLayoutDescriptor} the entries of this bind group will conform to.
     */
    layout: IGPUBindGroupLayoutDescriptor;

    /**
     * A list of entries describing the resources to expose to the shader for each binding
     * described by the {@link GPUBindGroupDescriptor#layout}.
     *
     * {@link GPUBindGroupEntry}
     */
    entries: IGPUBindGroupEntry[];
}

/**
 * GPU绑定组布局描述。
 *
 * @see GPUBindGroupLayoutDescriptor
 * @see GPUDevice.createBindGroupLayout
 */
export interface IGPUBindGroupLayoutDescriptor extends Omit<GPUBindGroupLayoutDescriptor, "entries">
{
    entries: IGPUBindGroupLayoutEntry[];
}

/**
 * 绑定组入口布局描述。
 *
 * @see GPUBindGroupLayoutEntry
 */
export interface IGPUBindGroupLayoutEntry extends Omit<GPUBindGroupLayoutEntry, "visibility">
{
    /**
     * A bitset of the members of {@link GPUShaderStage}.
     * Each set bit indicates that a {@link GPUBindGroupLayoutEntry}'s resource
     * will be accessible from the associated shader stage.
     */
    visibility: IGPUShaderStageFlags[];
}

/**
 * GPU着色阶段。
 *
 * @see GPUShaderStage
 */
export type IGPUShaderStageFlags = "VERTEX" | "FRAGMENT" | "COMPUTE";

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
