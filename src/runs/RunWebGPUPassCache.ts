import { IGPUBindingResources } from "../data/IGPUBindingResources";
import { IGPUComputeObject, IGPUComputePipeline } from "../data/IGPUComputeObject";
import { IGPURenderBundleObject } from "../data/IGPURenderBundleObject";
import { IGPURenderObject, IGPURenderPipeline, IGPUSetBindGroup } from "../data/IGPURenderObject";
import { IGPURenderOcclusionQueryObject } from "../data/IGPURenderOcclusionQueryObject";
import { IGPUScissorRect } from "../data/IGPUScissorRect";
import { IGPUVertexAttributes } from "../data/IGPUVertexAttributes";
import { IGPUViewport } from "../data/IGPUViewport";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { RunWebGPU } from "./RunWebGPU";

/**
 * 对比已提交的数据，较少重复提交来提升性能。
 */
export class RunWebGPUPassCache extends RunWebGPU
{
    protected runComputeObjects(device: GPUDevice, passEncoder: GPUComputePassEncoder, computeObjects: IGPUComputeObject[])
    {
        passEncoder["_setBindGroup"] = passEncoder["_setBindGroup"] || [];

        super.runComputeObjects(device, passEncoder, computeObjects);
    }

    protected runRenderPassObjects(device: GPUDevice, passEncoder: GPURenderPassEncoder, renderPassFormats: IGPURenderPassFormat, renderObjects?: (IGPURenderOcclusionQueryObject | IGPURenderObject | IGPURenderBundleObject)[])
    {
        passEncoder["_setBindGroup"] = passEncoder["_setBindGroup"] || [];

        super.runRenderPassObjects(device, passEncoder, renderPassFormats, renderObjects);
    }

    protected runRenderBundleObjects(device: GPUDevice, bundleEncoder: GPURenderBundleEncoder, renderPassFormats: IGPURenderPassFormat, renderObjects?: IGPURenderObject[])
    {
        bundleEncoder["_setBindGroup"] = bundleEncoder["_setBindGroup"] || [];

        super.runRenderBundleObjects(device, bundleEncoder, renderPassFormats, renderObjects);
    }

    protected runViewport(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, viewport?: IGPUViewport)
    {
        if (!viewport) return;
        if (passEncoder["_viewport"] === viewport) return;
        passEncoder["_viewport"] = viewport;

        super.runViewport(passEncoder, attachmentSize, viewport);
    }

    protected runScissorRect(passEncoder: GPURenderPassEncoder, attachmentSize: { width: number, height: number }, scissorRect?: IGPUScissorRect)
    {
        if (!scissorRect) return;
        if (passEncoder["_scissorRect"] === scissorRect) return;
        passEncoder["_scissorRect"] = scissorRect;

        super.runScissorRect(passEncoder, attachmentSize, scissorRect);
    }

    protected runRenderPipeline(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPipeline: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IGPUVertexAttributes)
    {
        if (passEncoder["_renderPipeline"] === renderPipeline) return;
        if (renderPipeline) passEncoder["_renderPipeline"] = renderPipeline;

        super.runRenderPipeline(device, passEncoder, renderPipeline, renderPassFormat, vertices);
    }

    protected runBindingResources(device: GPUDevice, passEncoder: GPUBindingCommandsMixin, pipeline: IGPUComputePipeline | IGPURenderPipeline, bindingResources: IGPUBindingResources)
    {
        if (passEncoder["_bindingResources"] === bindingResources) return;
        if (bindingResources) passEncoder["_bindingResources"] = bindingResources;

        super.runBindingResources(device, passEncoder, pipeline, bindingResources);
    }

    protected runSetBindGroup(device: GPUDevice, passEncoder: GPUBindingCommandsMixin, index: number, setBindGroup: IGPUSetBindGroup)
    {
        if (passEncoder["_setBindGroup"][index] === setBindGroup)
        {
            return;
        }
        passEncoder["_setBindGroup"][index] = setBindGroup;

        super.runSetBindGroup(device, passEncoder, index, setBindGroup);
    }

    protected runVertices(device: GPUDevice, passEncoder: GPURenderPassEncoder | GPURenderBundleEncoder, renderPipeline: IGPURenderPipeline, renderPassFormat: IGPURenderPassFormat, vertices: IGPUVertexAttributes)
    {
        if (passEncoder["_vertices"] === vertices) return;
        if (vertices) passEncoder["_vertices"] = vertices;

        super.runVertices(device, passEncoder, renderPipeline, renderPassFormat, vertices);
    }

    protected runIndices(device: GPUDevice, passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, indices: Uint16Array | Uint32Array)
    {
        if (passEncoder["_indices"] === indices) return;
        if (indices) passEncoder["_indices"] = indices;

        super.runIndices(device, passEncoder, indices);
    }
}
