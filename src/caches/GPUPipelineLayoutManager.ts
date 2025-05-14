import { ChainMap } from "@feng3d/render-api";
import { GPUBindGroupLayoutEntryMap, WgslReflectManager } from "./WgslReflectManager";

declare global
{
    interface GPUPipelineLayout
    {
        /**
         * 绑定组布局列表。
         *
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        bindGroupLayouts: GPUBindGroupLayout[];
    }

    interface GPUBindGroupLayout
    {
        /**
         * 绑定组布局的入口列表。
         *
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        entries: GPUBindGroupLayoutEntry[];
    }

    interface BindGroupLayoutDescriptor
    {
        /**
         * 绑定组布局的入口列表。
         *
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        entries: GPUBindGroupLayoutEntry[];

        /**
         * 用于判断布局信息是否相同的标识。
         *
         * 注：wgsl着色器被反射过程中将会被引擎自动赋值。
         */
        label?: string,
    }
}

interface PipelineLayoutDescriptor
{
    bindGroupLayouts: BindGroupLayoutDescriptor[];
}

export class GPUPipelineLayoutManager
{
    static getGPUPipelineLayout(device: GPUDevice, shader: { vertex: string, fragment: string } | { compute: string })
    {
        const pipelineLayout = GPUPipelineLayoutManager.getPipelineLayout(shader);

        //
        const key = [device, pipelineLayout];
        let gpuPipelineLayout = this._gpuPipelineLayoutMap.get(key);
        if (gpuPipelineLayout) return gpuPipelineLayout;

        const bindGroupLayouts: GPUBindGroupLayout[] = pipelineLayout.bindGroupLayouts.map((v) =>
        {
            const gpuBindGroupLayout = device.createBindGroupLayout(v);
            gpuBindGroupLayout.entries = v.entries;

            return gpuBindGroupLayout;
        });

        const descriptor: GPUPipelineLayoutDescriptor = {
            bindGroupLayouts,
        };

        gpuPipelineLayout = device.createPipelineLayout(descriptor);
        gpuPipelineLayout.bindGroupLayouts = bindGroupLayouts;
        this._gpuPipelineLayoutMap.set(key, gpuPipelineLayout);

        return gpuPipelineLayout;
    }
    private static readonly _gpuPipelineLayoutMap = new ChainMap<any[], GPUPipelineLayout>();

    /**
     * 从GPU管线中获取管线布局。
     *
     * @param shader GPU管线。
     * @returns 管线布局。
     */
    static getPipelineLayout(shader: { vertex: string, fragment: string } | { compute: string })
    {
        let shaderKey = "";
        if ("compute" in shader)
        {
            shaderKey += shader.compute;
        }
        else
        {
            shaderKey += shader.vertex;
            if (shader.fragment) shaderKey += `\n// ------顶点与片段着色器分界--------\n${shader.fragment}`;
        }

        let gpuPipelineLayout = this.getGPUPipelineLayoutMap[shaderKey];
        if (gpuPipelineLayout) return gpuPipelineLayout;

        let entryMap: GPUBindGroupLayoutEntryMap;
        if ("compute" in shader)
        {
            entryMap = WgslReflectManager.getIGPUBindGroupLayoutEntryMap(shader.compute);
        }
        else
        {
            entryMap = WgslReflectManager.getIGPUBindGroupLayoutEntryMap(shader.vertex);
            if ("fragment" in shader)
            {
                const fragmentEntryMap = WgslReflectManager.getIGPUBindGroupLayoutEntryMap(shader.fragment);
                for (const resourceName in fragmentEntryMap)
                {
                    // 检测相同名称是否被定义在多个地方
                    if (entryMap[resourceName])
                    {
                        const preEntry = entryMap[resourceName].variableInfo;
                        const currentEntry = fragmentEntryMap[resourceName].variableInfo;

                        if (preEntry.group !== currentEntry.group
                            || preEntry.binding !== currentEntry.binding
                            || preEntry.resourceType !== currentEntry.resourceType
                        )
                        {
                            console.warn(`分别在 着色器 @group(${preEntry.group}) @binding(${preEntry.binding}) 与 @group(${currentEntry.group}) @binding(${currentEntry.binding}) 处存在相同名称的变量 ${currentEntry.name} 。`);
                        }
                    }
                    entryMap[resourceName] = fragmentEntryMap[resourceName];
                }
            }
        }

        // 绑定组布局描述列表。
        const bindGroupLayoutDescriptors: BindGroupLayoutDescriptor[] = [];
        for (const resourceName in entryMap)
        {
            const bindGroupLayoutEntry = entryMap[resourceName];
            const { group, binding } = bindGroupLayoutEntry.variableInfo;
            //
            const bindGroupLayoutDescriptor = bindGroupLayoutDescriptors[group] ??= { entries: [] };

            // 检测相同位置是否存在多个定义
            if (bindGroupLayoutDescriptor.entries[binding])
            {
                // 存在重复定义时，判断是否兼容
                const preEntry = bindGroupLayoutDescriptor.entries[binding];
                console.error(`在管线中 @group(${group}) @binding(${binding}) 处存在多个定义 ${preEntry.variableInfo.name} ${resourceName} ！`);
            }

            //
            bindGroupLayoutDescriptor.entries[binding] = bindGroupLayoutEntry;
        }

        // 绑定组布局列表。
        const bindGroupLayouts = bindGroupLayoutDescriptors.map((descriptor) =>
        {
            // 排除 undefined 元素。
            const entries = (descriptor.entries as GPUBindGroupLayoutEntry[]).filter((v) => !!v);
            const label = entries.map((v) => v.key).join(",");
            // 相同的布局只保留一个。
            let bindGroupLayout = this._bindGroupLayoutDescriptor[label];
            if (!bindGroupLayout)
            {
                bindGroupLayout = this._bindGroupLayoutDescriptor[label] = { entries, label: label };
            }

            return bindGroupLayout;
        });

        // 管线布局描述标识符。
        const pipelineLayoutKey = bindGroupLayouts.map((v, i) => `[${i}: ${v.label}]`).join(",");
        gpuPipelineLayout = this._pipelineLayoutDescriptorMap[pipelineLayoutKey];
        if (!gpuPipelineLayout)
        {
            gpuPipelineLayout = this._pipelineLayoutDescriptorMap[pipelineLayoutKey] = {
                bindGroupLayouts,
            };
            gpuPipelineLayout.bindGroupLayouts = bindGroupLayouts;
        }

        this.getGPUPipelineLayoutMap[shaderKey] = gpuPipelineLayout;

        return gpuPipelineLayout;
    }
    private static readonly getGPUPipelineLayoutMap: { [shaderKey: string]: PipelineLayoutDescriptor } = {};
    private static readonly _bindGroupLayoutDescriptor: { [key: string]: BindGroupLayoutDescriptor } = {};
    private static readonly _pipelineLayoutDescriptorMap: { [key: string]: PipelineLayoutDescriptor } = {};
}

type GetGPUPipelineLayoutKey = [shaderKey: string];
