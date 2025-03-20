import { BindingResources, BufferBinding, BufferBindingInfo, ChainMap, computed, ComputedRef, Sampler, TextureView } from "@feng3d/render-api";
import { ResourceType } from "wgsl_reflect";
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
        const entries = bindGroupLayout.entries.map((v) =>
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
