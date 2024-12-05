import { anyEmitter } from "@feng3d/event";
import { watcher } from "@feng3d/watcher";
import { getRealGPUBindGroup } from "../const";
import { IGPUBufferBinding } from "../data/IGPUBufferBinding";
import { IGPUExternalTexture } from "../data/IGPUExternalTexture";
import { IGPUSampler } from "../data/IGPUSampler";
import { IGPUCanvasTexture } from "../data/IGPUTexture";
import { IGPUTextureView } from "../data/IGPUTextureView";
import { GPUTextureView_destroy, IGPUSampler_changed } from "../eventnames";
import { IGPUBindGroupDescriptor } from "../internal/IGPUBindGroupDescriptor";
import { getGPUBindGroupLayout } from "./getGPUBindGroupLayout";
import { getGPUBufferBinding } from "./getGPUBufferBinding";
import { getGPUSampler } from "./getGPUSampler";
import { getGPUTextureView } from "./getGPUTextureView";

export function getGPUBindGroup(device: GPUDevice, bindGroup: IGPUBindGroupDescriptor)
{
    const bindGroupMap: WeakMap<IGPUBindGroupDescriptor, GPUBindGroup> = device["_bindGroupMap"] = device["_bindGroupMap"] || new WeakMap();

    let gBindGroup = bindGroupMap.get(bindGroup);
    if (gBindGroup) return gBindGroup;

    // 总是更新函数列表。
    const awaysUpdateFuncs: (() => void)[] = [];
    // 执行一次函数列表
    const onceUpdateFuncs: (() => void)[] = [];

    const layout = getGPUBindGroupLayout(device, bindGroup.layout);

    const entries = bindGroup.entries.map((v) =>
    {
        const entry: GPUBindGroupEntry = { binding: v.binding, resource: null };

        // 更新资源函数。
        let updateResource: () => void;

        // 资源变化后更新函数。
        const onResourceChanged = () =>
        {
            onceUpdateFuncs.push(updateResource);

            if (gBindGroup[getRealGPUBindGroup] !== getReal)
            {
                gBindGroup[getRealGPUBindGroup] = createBindGroup;
            }
        };

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

                anyEmitter.once(entry.resource, GPUTextureView_destroy, onResourceChanged);
            };

            if (((v.resource as IGPUTextureView).texture as IGPUCanvasTexture).context)
            {
                awaysUpdateFuncs.push(updateResource);
            }
        }
        else if ((v.resource as IGPUExternalTexture).source)
        {
            updateResource = () =>
            {
                entry.resource = device.importExternalTexture(v.resource as IGPUExternalTexture);
            };

            awaysUpdateFuncs.push(updateResource);
        }
        else
        {
            updateResource = () =>
            {
                entry.resource = getGPUSampler(device, v.resource as IGPUSampler);
                anyEmitter.once(v.resource as IGPUSampler, IGPUSampler_changed, onResourceChanged);
            };
        }

        updateResource();

        // 监听绑定资源发生改变
        watcher.watch(v, "resource", onResourceChanged);

        return entry;
    });

    const getReal = () =>
    {
        awaysUpdateFuncs.forEach((v) => v());
        createBindGroup();

        return gBindGroup;
    };

    const createBindGroup = () =>
    {
        onceUpdateFuncs.forEach((v) => v());

        gBindGroup = device.createBindGroup({ layout, entries });

        bindGroupMap.set(bindGroup, gBindGroup);

        // 设置更新外部纹理/画布纹理视图
        if (awaysUpdateFuncs.length > 0)
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
