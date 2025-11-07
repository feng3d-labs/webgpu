import { reactive } from "@feng3d/reactivity";
import { RenderObject } from "@feng3d/render-api";
import { WGPUBindGroup } from "../../caches/WGPUBindGroup";
import { WGPUPipelineLayout } from "../../caches/WGPUPipelineLayout";
import { WGPURenderObjectState } from "../WGPURenderObjectState";

export function runBindGroup(renderObject: RenderObject, state: WGPURenderObjectState, device: GPUDevice)
{
    const r_renderObject = reactive(renderObject);
    r_renderObject.bindingResources;

    // 执行
    const { bindingResources } = renderObject;
    const layout = WGPUPipelineLayout.getPipelineLayout({ vertex: r_renderObject.pipeline.vertex.code, fragment: r_renderObject.pipeline.fragment?.code });

    layout.bindGroupLayouts.forEach((bindGroupLayout, index) =>
    {
        const wgpuBindGroup = WGPUBindGroup.getInstance(device, bindGroupLayout, bindingResources);

        state.setBindGroup(index, wgpuBindGroup.gpuBindGroup);
    });
}