import { computed, reactive } from "@feng3d/reactivity";
import { RenderObject } from "@feng3d/render-api";
import { WGPURenderPipeline } from "../../caches/WGPURenderPipeline";
import { RenderPassFormat } from "../RenderPassFormat";
import { WGPURenderObjectState } from "../WGPURenderObjectState";

export function getSetPipeline(renderObject: RenderObject)
{
    const r_renderObject = reactive(renderObject);
    return computed(() =>
    {
        r_renderObject.pipeline;
        r_renderObject.vertices;
        r_renderObject.indices;

        return (state: WGPURenderObjectState, device: GPUDevice, renderPassFormat: RenderPassFormat) =>
        {
            //
            const { pipeline, vertices, indices } = renderObject;
            //
            const indexFormat: GPUIndexFormat = indices ? (indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16') : undefined;

            //
            const wgpuRenderPipeline = WGPURenderPipeline.getInstance(device, pipeline, renderPassFormat, vertices, indexFormat);
            const gpuRenderPipeline = wgpuRenderPipeline.gpuRenderPipeline;

            state.setPipeline(gpuRenderPipeline);
        };
    });
}
