import { anyEmitter } from "@feng3d/event";
import { watcher } from "@feng3d/watcher";
import { getRealGPUBindGroup } from "../const";
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
        const entry: GPUBindGroupEntry = { binding: v.binding, resource: null };

        // 更新资源函数。
        let updateResource: () => void;

        //
        if ((v.resource as IGPUBufferBinding).bufferView)
        {
            updateResource = () =>
            {
                entry.resource = getGPUBufferBinding(device, v.resource as IGPUBufferBinding);
            };
        }
        else if ((v.resource as IGPUTextureView).texture)
        {
            updateResource = () =>
            {
                entry.resource = getGPUTextureView(device, v.resource as IGPUTextureView);

                anyEmitter.once(entry.resource, GPUTextureView_destroy, () =>
                {
                    bindGroupMap.delete(bindGroup);
                });
            };

            if (((v.resource as IGPUTextureView).texture as IGPUTextureFromContext).context)
            {
                hasContextTexture = true;
                updateFuncs.push(updateResource);
            }
        }
        else if ((v.resource as IGPUExternalTexture).source)
        {
            updateResource = () =>
            {
                entry.resource = getGPUExternalTexture(device, v.resource as IGPUExternalTexture);
            };

            hasExternalTexture = true;
            updateFuncs.push(updateResource);
        }
        else 
        {
            updateResource = () =>
            {
                entry.resource = getGPUSampler(device, v.resource as IGPUSampler);
            };
        }

        updateResource();

        // 监听绑定资源发生改变
        watcher.watch(v, "resource", () =>
        {
            bindGroupMap.delete(bindGroup);

            // 更新绑定组资源
            updateResource();

            createBindGroup();
        });

        return entry;
    });

    const getReal = () =>
    {
        updateFuncs.forEach((v) => v());
        createBindGroup();

        return gBindGroup;
    };

    const createBindGroup = () =>
    {
        gBindGroup = device.createBindGroup({ layout, entries, });

        bindGroupMap.set(bindGroup, gBindGroup);

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
    };

    createBindGroup();

    return gBindGroup;
}
