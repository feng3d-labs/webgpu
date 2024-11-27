import { anyEmitter } from "@feng3d/event";
import { watcher } from "@feng3d/watcher";
import { IGPUBindGroupDescriptor, IGPUBufferBinding, IGPUExternalTexture } from "../data/IGPUBindGroupDescriptor";
import { IGPUSampler } from "../data/IGPUSampler";
import { IGPUTextureFromContext } from "../data/IGPUTexture";
import { IGPUTextureView } from "../data/IGPUTextureView";
import { GPUTextureView_destroy } from "../eventnames";
import { getGPUBindGroupLayout } from "./getGPUBindGroupLayout";
import { getGPUBufferBinding } from "./getGPUBufferBinding";
import { getGPUExternalTexture } from "./getGPUExternalTexture";
import { getGPUSampler } from "./getGPUSampler";
import { getGPUTextureView } from "./getGPUTextureView";
import { getRealGPUBindGroup } from "../const";

export function getGPUBindGroup(device: GPUDevice, bindGroup: IGPUBindGroupDescriptor)
{
    const bindGroupMap: WeakMap<IGPUBindGroupDescriptor, GPUBindGroup> = device["_bindGroupMap"] = device["_bindGroupMap"] || new WeakMap();

    let gBindGroup = bindGroupMap.get(bindGroup);
    if (gBindGroup) return gBindGroup;

    // 是否有外部纹理
    let hasExternalTexture = false;
    /**
     * 是否存在从 画布上下文 获取的纹理视图。
     */
    let hasContextTexture = false;

    const updateFuncs: (() => void)[] = [];

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
            if ((v.resource as IGPUBufferBinding).bufferView)
            {
                const iGPUBufferBinding = v.resource as IGPUBufferBinding;
                resource = getGPUBufferBinding(device, iGPUBufferBinding);
            }
            else if ((v.resource as IGPUTextureView).texture)
            {
                const iGPUTextureView = v.resource as IGPUTextureView;
                resource = getGPUTextureView(device, iGPUTextureView);
                if ((iGPUTextureView.texture as IGPUTextureFromContext).context)
                {
                    hasContextTexture = true;
                    updateFuncs.push(() => { entry.resource = getGPUTextureView(device, iGPUTextureView); });
                }
                anyEmitter.once(resource, GPUTextureView_destroy, () =>
                {
                    bindGroupMap.delete(bindGroup);
                });
            }
            else if ((v.resource as IGPUExternalTexture).source)
            {
                const iGPUExternalTexture = v.resource as IGPUExternalTexture;
                resource = getGPUExternalTexture(device, iGPUExternalTexture);
                hasExternalTexture = true;
                updateFuncs.push(() => { entry.resource = getGPUExternalTexture(device, iGPUExternalTexture); });
            }
            else 
            {
                const iGPUSampler = v.resource as IGPUSampler;
                resource = getGPUSampler(device, iGPUSampler);
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

        bindGroupMap.set(bindGroup, gBindGroup);
    };

    createBindGroup();

    const getReal = () =>
    {

        updateFuncs.forEach((v) => v());
        createBindGroup();
        gBindGroup[getRealGPUBindGroup] = getReal;

        return gBindGroup;
    };

    // 设置更新外部纹理/画布纹理视图
    if (hasExternalTexture || hasContextTexture)
    {
        gBindGroup[getRealGPUBindGroup] = getReal;
    }
    else
    {
        gBindGroup[getRealGPUBindGroup] = () => gBindGroup;
    }

    return gBindGroup;
}
