import { anyEmitter } from "@feng3d/event";
import { BufferBinding, CanvasTexture, Sampler, TextureView, UniformType } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { getRealGPUBindGroup } from "../const";
import { VideoTexture } from "../data/VideoTexture";
import { GPUTextureView_destroy, IGPUSampler_changed } from "../eventnames";
import { getGPUBindGroupLayout } from "./getGPUBindGroupLayout";
import { getGPUBuffer } from "./getGPUBuffer";
import { getGPUSampler } from "./getGPUSampler";
import { getGPUTextureView } from "./getGPUTextureView";
import { getIGPUBuffer } from "./getIGPUBuffer";

export function getGPUBindGroup(device: GPUDevice, bindGroup: BindGroupDescriptor)
{
    const bindGroupMap: WeakMap<BindGroupDescriptor, GPUBindGroup> = device["_bindGroupMap"] = device["_bindGroupMap"] || new WeakMap();

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
        if ((v.resource as BufferBinding).bufferView)
        {
            updateResource = () =>
            {
                const resource = v.resource as BufferBinding;
                //
                const b = getIGPUBuffer(resource.bufferView);
                const buffer = getGPUBuffer(device, b);

                const offset = resource.bufferView.byteOffset;
                const size = resource.bufferView.byteLength;

                entry.resource = {
                    buffer,
                    offset,
                    size,
                };
            };
        }
        else if ((v.resource as TextureView).texture)
        {
            updateResource = () =>
            {
                entry.resource = getGPUTextureView(device, v.resource as TextureView);

                anyEmitter.once(entry.resource, GPUTextureView_destroy, onResourceChanged);
            };

            if (((v.resource as TextureView).texture as CanvasTexture).context)
            {
                awaysUpdateFuncs.push(updateResource);
            }
        }
        else if ((v.resource as VideoTexture).source)
        {
            updateResource = () =>
            {
                entry.resource = device.importExternalTexture(v.resource as VideoTexture);
            };

            awaysUpdateFuncs.push(updateResource);
        }
        else
        {
            updateResource = () =>
            {
                entry.resource = getGPUSampler(device, v.resource as Sampler);
                anyEmitter.once(v.resource as Sampler, IGPUSampler_changed, onResourceChanged);
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
    resource: BindingResource;
}

export type BindingResource = Sampler | TextureView | VideoTexture | UniformType;
