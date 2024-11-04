import { watcher } from "@feng3d/watcher";
import { IGPUBindGroup } from "../data/IGPUBindGroup";
import { getGPUBindGroupLayout } from "./getGPUBindGroupLayout";
import { getGPUBufferBinding, isBufferBinding } from "./getGPUBufferBinding";
import { getGPUExternalTexture, isExternalTexture } from "./getGPUExternalTexture";
import { getGPUSampler, isSampler } from "./getGPUSampler";
import { isFromContext } from "./getGPUTexture";
import { getGPUTextureView, gpuTextureViewEventEmitter, isTextureView } from "./getGPUTextureView";

export function getGPUBindGroup(device: GPUDevice, bindGroup: IGPUBindGroup)
{
    let gBindGroup = bindGroupMap.get(bindGroup);
    if (gBindGroup) return gBindGroup;

    // 是否有外部纹理
    let hasExternalTexture = false;
    /**
     * 是否存在从 画布上下文 获取的纹理视图。
     */
    let hasContextTexture = false;

    const layout = getGPUBindGroupLayout(device, bindGroup.layout);

    const entries = bindGroup.entries.map((v) =>
    {
        const entry: GPUBindGroupEntry = {
            binding: v.binding,
            resource: null,
        };

        //
        const getGPUBindingResource = () =>
        {
            let resource: GPUBindingResource;
            if (isBufferBinding(v.resource))
            {
                resource = getGPUBufferBinding(device, v.resource);
            }
            else if (isTextureView(v.resource))
            {
                resource = getGPUTextureView(device, v.resource);
                if (isFromContext(v.resource.texture))
                {
                    hasContextTexture = true;
                }
                gpuTextureViewEventEmitter.once(resource, "destroy", () =>
                {
                    bindGroupMap.delete(bindGroup);
                });
            }
            else if (isExternalTexture(v.resource))
            {
                resource = getGPUExternalTexture(device, v.resource);
                hasExternalTexture = true;
            }
            else if (isSampler(v.resource))
            {
                const gpuSampler = v.resource;
                resource = getGPUSampler(device, gpuSampler);
            }
            else
            {
                throw `无法识别 BindGroup ${v}`;
            }

            return resource;
        };

        entry.resource = getGPUBindingResource();

        // 监听绑定资源发生改变
        watcher.watch(v, "resource", () =>
        {
            bindGroupMap.delete(bindGroup);

            // 更新绑定组资源
            entry.resource = getGPUBindingResource();

            createBindGroup();
        });

        return entry;
    });

    const createBindGroup = () =>
    {
        gBindGroup = device.createBindGroup({
            layout,
            entries,
        });

        // 由于外部纹理 与画布上下文获取的纹理 每帧都会被释放，GPUBindGroup将会失效，因此不进行缓存
        if (!hasExternalTexture && !hasContextTexture)
        {
            bindGroupMap.set(bindGroup, gBindGroup);
        }
    };

    createBindGroup();

    return gBindGroup;
}

const bindGroupMap = new WeakMap<IGPUBindGroup, GPUBindGroup>();
