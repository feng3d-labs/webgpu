import { BindingResources, BufferBinding, ChainMap, computed, ComputedRef, reactive, Sampler, TextureView } from "@feng3d/render-api";
import { ResourceType, TypeInfo } from "wgsl_reflect";
import { VideoTexture } from "../data/VideoTexture";
import { webgpuEvents } from "../eventnames";
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
                entry.resource = getGPUBindingResource(device, bindingResources, name, type);
            }
            else if (ExternalSampledTextureType[type.name]) // 判断是否为外部纹理
            {
                entry.resource = getGPUExternalTexture(device, bindingResources[name] as VideoTexture);
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

function getGPUBindingResource(device: GPUDevice, bindingResources: BindingResources, name: string, type: TypeInfo)
{
    const getGPUBindingResourceKey: GetGPUBindingResourceKey = [device, bindingResources, name, type];
    let result = getGPUBindingResourceMap.get(getGPUBindingResourceKey);
    if (result) return result.value;

    result = computed(() =>
    {
        // 监听
        const r_bindingResources = reactive(bindingResources);
        (r_bindingResources[name] as BufferBinding)?.bufferView;

        // 执行
        const resource = bindingResources[name] as BufferBinding;
        const bufferBinding = ((typeof resource === "number") ? [resource] : resource) as BufferBinding; // 值为number且不断改变时将可能会产生无数细碎gpu缓冲区。
        const bufferBindingInfo = getBufferBindingInfo(type);
        // 更新缓冲区绑定的数据。
        updateBufferBinding(bufferBindingInfo, bufferBinding);
        //
        const gbuffer = getGBuffer(bufferBinding.bufferView);
        (gbuffer as any).label = gbuffer.label || (`BufferBinding ${name}`);
        //
        const buffer = getGPUBuffer(device, gbuffer);

        const offset = resource.bufferView.byteOffset;
        const size = resource.bufferView.byteLength;

        const gpuBindingResource: GPUBindingResource = {
            buffer,
            offset,
            size,
        };

        return gpuBindingResource;
    });

    getGPUBindingResourceMap.set(getGPUBindingResourceKey, result);

    return result.value;
}
type GetGPUBindingResourceKey = [device: GPUDevice, bindingResources: BindingResources, name: string, type: TypeInfo];
const getGPUBindingResourceMap = new ChainMap<GetGPUBindingResourceKey, ComputedRef<GPUBindingResource>>();

function getGPUExternalTexture(device: GPUDevice, videoTexture: VideoTexture)
{
    let result = getGPUExternalTextureMap.get(videoTexture);
    if (result) return result.value;

    result = computed(() =>
    {
        // 监听 
        reactive(webgpuEvents).preSubmit;

        //
        const resource = device.importExternalTexture(videoTexture);

        return resource;
    });
    getGPUExternalTextureMap.set(videoTexture, result);

    return result.value;
}
const getGPUExternalTextureMap = new WeakMap<VideoTexture, ComputedRef<GPUExternalTexture>>();
