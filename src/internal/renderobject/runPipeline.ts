import { computed, reactive } from '@feng3d/reactivity';
import { RenderObject } from '@feng3d/render-api';
import { WGPURenderPipeline } from '../../caches/WGPURenderPipeline';
import { RenderPassFormat } from '../RenderPassFormat';
import { WGPURenderObjectState } from '../WGPURenderObjectState';

export function runPipeline(renderObject: RenderObject, state: WGPURenderObjectState, device: GPUDevice, renderPassFormat: RenderPassFormat)
{
    const r_renderObject = reactive(renderObject);
    r_renderObject.pipeline;
    r_renderObject.vertices;
    r_renderObject.indices;

    const { pipeline, vertices, indices } = renderObject;
    //
    const indexFormat: GPUIndexFormat = indices ? (indices.BYTES_PER_ELEMENT === 4 ? 'uint32' : 'uint16') : undefined;

    //
    const wgpuRenderPipeline = WGPURenderPipeline.getInstance(device, pipeline, renderPassFormat, vertices, indexFormat);
    const gpuRenderPipeline = wgpuRenderPipeline.gpuRenderPipeline;

    state.setPipeline(gpuRenderPipeline);
}
