import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject } from "@feng3d/render-api";
import { WGPUBindGroup } from "../../caches/WGPUBindGroup";
import { WGPUPipelineLayout } from "../../caches/WGPUPipelineLayout";

export function getSetBindGroup(device: GPUDevice, renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        // 监听
        r_renderObject.bindingResources;

        // 执行
        const { bindingResources } = renderObject;
        const layout = WGPUPipelineLayout.getPipelineLayout({ vertex: r_renderObject.pipeline.vertex.code, fragment: r_renderObject.pipeline.fragment?.code });

        const bindGroups = layout.bindGroupLayouts.map(bindGroupLayout =>
        {
            const wgpuBindGroup = WGPUBindGroup.getInstance(device, bindGroupLayout, bindingResources);
            return wgpuBindGroup.gpuBindGroup;
        });

        return bindGroups;
    });
}