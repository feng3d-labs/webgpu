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

    // 总是更新函数列表
    const awaysUpdateFuncs: (() => void)[] = [];
    // 执行一次函数列表
    const onceUpdateFuncs: (() => void)[] = [];

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
            onceUpdateFuncs.push(updateResource);
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
                awaysUpdateFuncs.push(updateResource);
            }
            else
            {
                onceUpdateFuncs.push(updateResource);
            }
        }
        else if ((v.resource as IGPUExternalTexture).source)
        {
            updateResource = () =>
            {
                entry.resource = getGPUExternalTexture(device, v.resource as IGPUExternalTexture);
            };

            awaysUpdateFuncs.push(updateResource);
        }
        else 
        {
            updateResource = () =>
            {
                entry.resource = getGPUSampler(device, v.resource as IGPUSampler);
            };
            onceUpdateFuncs.push(updateResource);
        }

        // 监听绑定资源发生改变
        watcher.watch(v, "resource", () =>
        {
            bindGroupMap.delete(bindGroup);

            //
            onceUpdateFuncs.push(updateResource);
        });

        return entry;
    });

    const getBindGroup = () =>
    {
        if (awaysUpdateFuncs.length > 0 || onceUpdateFuncs.length > 0)
        {
            // 执行更新函数
            awaysUpdateFuncs.forEach((v) => v());
            onceUpdateFuncs.forEach((v) => v());
            onceUpdateFuncs.length = 0;

            // 创建
            gBindGroup = device.createBindGroup({ layout, entries, });
            bindGroupMap.set(bindGroup, gBindGroup);
            gBindGroup[getRealGPUBindGroup] = getBindGroup;
        }

        return gBindGroup;
    };

    getBindGroup();

    return gBindGroup;
}
