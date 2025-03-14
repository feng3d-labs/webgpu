import { anyEmitter } from "@feng3d/event";
import { BufferBinding, BufferBindingInfo, CanvasTexture, Sampler, TextureView, BindingResources, BindingResource } from "@feng3d/render-api";
import { watcher } from "@feng3d/watcher";
import { getRealGPUBindGroup } from "../const";
import { VideoTexture } from "../data/VideoTexture";
import { GPUTextureView_destroy, IGPUSampler_changed } from "../eventnames";
import { ChainMap } from "../utils/ChainMap";
import { getBufferBindingInfo } from "../utils/getBufferBindingInfo";
import { updateBufferBinding } from "../utils/updateBufferBinding";
import { getGPUBuffer } from "./getGPUBuffer";
import { getGPUSampler } from "./getGPUSampler";
import { getGPUTextureView } from "./getGPUTextureView";
import { getIGPUBuffer } from "./getIGPUBuffer";

export function getGPUBindGroup(device: GPUDevice, bindGroupLayout: GPUBindGroupLayout, bindingResources: BindingResources)
{
    const bindGroupDescriptor = getSetBindGroup(bindGroupLayout, bindingResources);

    const bindGroupMap: WeakMap<BindGroupDescriptor, GPUBindGroup> = device["_bindGroupMap"] = device["_bindGroupMap"] || new WeakMap();

    let gBindGroup = bindGroupMap.get(bindGroupDescriptor);
    if (gBindGroup) return gBindGroup;

    // 总是更新函数列表。
    const awaysUpdateFuncs: (() => void)[] = [];
    // 执行一次函数列表
    const onceUpdateFuncs: (() => void)[] = [];

    const entries = bindGroupDescriptor.entries.map((v) =>
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

        gBindGroup = device.createBindGroup({ layout: bindGroupLayout, entries });

        bindGroupMap.set(bindGroupDescriptor, gBindGroup);

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
    resource: Sampler | TextureView | VideoTexture | BindingResource;
}

function getSetBindGroup(bindGroupLayout: GPUBindGroupLayout, bindingResources: BindingResources)
{
    const map: ChainMap<Array<any>, BindGroupDescriptor> = bindGroupLayout["_bindingResources"] = bindGroupLayout["_bindingResources"] || new ChainMap();
    const subBindingResources = (bindGroupLayout.entries as GPUBindGroupLayoutEntry[]).map(v => v.variableInfo.name).map((v) => bindingResources[v]);
    let bindGroupDescriptor = map.get(subBindingResources);
    if (bindGroupDescriptor) return bindGroupDescriptor;

    const entries: BindGroupEntry[] = [];
    bindGroupDescriptor = { layout: bindGroupLayout, entries };
    map.set(subBindingResources, bindGroupDescriptor);

    //
    (bindGroupLayout.entries as GPUBindGroupLayoutEntry[]).forEach((entry1) =>
    {
        const { variableInfo, binding } = entry1;
        //
        const entry: BindGroupEntry = { binding, resource: null };

        entries.push(entry);

        const resourceName = variableInfo.name;

        const updateResource = () =>
        {
            const bindingResource = bindingResources[resourceName];
            console.assert(!!bindingResource, `在绑定资源中没有找到 ${resourceName} 。`);

            //
            if (entry1.buffer)
            {
                const bufferBinding = ((typeof bindingResource === "number") ? [bindingResource] : bindingResource) as BufferBinding; // 值为number且不断改变时将可能会产生无数细碎gpu缓冲区。
                const bufferBindingInfo: BufferBindingInfo = variableInfo["_bufferBindingInfo"] ||= getBufferBindingInfo(variableInfo.type);
                // 更新缓冲区绑定的数据。
                updateBufferBinding(resourceName, bufferBindingInfo, bufferBinding);
                //
                const buffer = getIGPUBuffer(bufferBinding.bufferView);
                (buffer as any).label = buffer.label || (`BufferBinding ${variableInfo.name}`);
                //
                entry.resource = bufferBinding;
            }
            else
            {
                entry.resource = bindingResource;
            }
        };

        //
        updateResource();
        watcher.watch(bindingResources, resourceName, updateResource);
    });

    return bindGroupDescriptor;
}

