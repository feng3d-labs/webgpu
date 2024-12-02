import { IGPUBindingResource } from "../data/IGPUBindingResources";

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
