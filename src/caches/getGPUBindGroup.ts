import { BindingResource, BindingResources, BufferBinding, BufferBindingInfo, CanvasTexture, ChainMap, computed, ComputedRef, Sampler, TextureView } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { ResourceType } from "wgsl_reflect";
import { getRealGPUBindGroup } from "../const";
import { VideoTexture } from "../data/VideoTexture";
import { ExternalSampledTextureType } from "../types/TextureType";
import { getBufferBindingInfo } from "../utils/getBufferBindingInfo";
import { updateBufferBinding } from "../utils/updateBufferBinding";
import { getGPUBuffer } from "./getGPUBuffer";
import { getGPUSampler } from "./getGPUSampler";
import { getGPUTextureView } from "./getGPUTextureView";
import { getGBuffer } from "./getIGPUBuffer";

export function getGPUBindGroup(device: GPUDevice, bindGroupLayout: GPUBindGroupLayout, bindingResources: BindingResources)
{
    const getGPUBindGroupKey: GetGPUBindGroupKey = [device, bindGroupLayout, bindingResources];
    let result = getGPUBindGroupMap.get(getGPUBindGroupKey);
    if (result) return result.value;

    let gBindGroup: GPUBindGroup;
    result = computed(() =>
    {
        const entries = (bindGroupLayout.entries as GPUBindGroupLayoutEntry[]).map((v) =>
        {
            const { name, type, resourceType, binding } = v.variableInfo;

            const entry: GPUBindGroupEntry = { binding, resource: null };

            //
            if (resourceType === ResourceType.Uniform || resourceType === ResourceType.Storage)
            {
                const resource = bindingResources[name] as BufferBinding;

                const bufferBinding = ((typeof resource === "number") ? [resource] : resource) as BufferBinding; // 值为number且不断改变时将可能会产生无数细碎gpu缓冲区。
                const bufferBindingInfo: BufferBindingInfo = type["_bufferBindingInfo"] = type["_bufferBindingInfo"] || getBufferBindingInfo(type);
                // 更新缓冲区绑定的数据。
                updateBufferBinding(name, bufferBindingInfo, bufferBinding);
                //
                const gbuffer = getGBuffer(bufferBinding.bufferView);
                (gbuffer as any).label = gbuffer.label || (`BufferBinding ${name}`);
                //
                const buffer = getGPUBuffer(device, gbuffer);

                const offset = resource.bufferView.byteOffset;
                const size = resource.bufferView.byteLength;

                entry.resource = {
                    buffer,
                    offset,
                    size,
                };
            }
            else if (ExternalSampledTextureType[type.name]) // 判断是否为外部纹理
            {
                entry.resource = device.importExternalTexture(bindingResources[name] as VideoTexture);
            }
            else if (resourceType === ResourceType.Texture || resourceType === ResourceType.StorageTexture)
            {
                entry.resource = getGPUTextureView(device, bindingResources[name] as TextureView);
            }
            else
            {
                entry.resource = getGPUSampler(device, bindingResources[name] as Sampler);
            }

            return entry;
        });

        gBindGroup = device.createBindGroup({ layout: bindGroupLayout, entries });

        return gBindGroup;
    });
    getGPUBindGroupMap.set(getGPUBindGroupKey, result);

    return result.value;
}
type GetGPUBindGroupKey = [device: GPUDevice, bindGroupLayout: GPUBindGroupLayout, bindingResources: BindingResources];
const getGPUBindGroupMap = new ChainMap<GetGPUBindGroupKey, ComputedRef<GPUBindGroup>>();
/**
 * GPU 绑定组。
 *
 * @see GPUBindGroupDescriptor
 * @see GPUDevice.createBindGroup
 */
export interface BindGroupDescriptor
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
    entries: BindGroupEntry[];
}

/**
 * 绑定资源入口，指定资源绑定的位置。
 *
 * @see GPUBindGroupEntry
 */
export interface BindGroupEntry
{
    binding: GPUIndex32;

    /**
     * The resource to bind, which may be a {@link GPUSampler}, {@link GPUTextureView},
     * {@link GPUExternalTexture}, or {@link GPUBufferBinding}.
     */
    resource: Sampler | TextureView | VideoTexture | BindingResource;
}
