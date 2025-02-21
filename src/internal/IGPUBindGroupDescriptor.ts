import { IBufferBinding, Sampler, TextureView } from "@feng3d/render-api";
import { IGPUExternalTexture } from "../data/IGPUExternalTexture";

/**
 * GPU 绑定组。
 *
 * @see GPUBindGroupDescriptor
 * @see GPUDevice.createBindGroup
 */
export interface IGPUBindGroupDescriptor
{
    /**
     * The initial value of {@link GPUObjectBase#label|GPUObjectBase.label}.
     */
    label?: string;

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
export interface IGPUBindGroupEntry
{
    binding: GPUIndex32;

    /**
     * The resource to bind, which may be a {@link GPUSampler}, {@link GPUTextureView},
     * {@link GPUExternalTexture}, or {@link GPUBufferBinding}.
     */
    resource: IGPUBindingResource;
}

export type IGPUBindingResource = Sampler | TextureView | IBufferBinding | IGPUExternalTexture;
