import { IGPURenderObject } from "../data/IGPURenderObject";
import { IGPURenderPassFormat } from "../internal/IGPURenderPassFormat";
import { NGPURenderObject, NGPUSetBindGroup } from "../internal/NGPURenderObject";
import { getGPUBindGroup } from "./getGPUBindGroup";
import { getGPURenderPipeline } from "./getGPURenderPipeline";
import { getIGPUSetBindGroups } from "./getIGPUSetBindGroups";
import { getNGPURenderPipeline } from "./getNGPURenderPipeline";

export function getNGPURenderObject(device: GPUDevice, renderPassFormat: IGPURenderPassFormat, renderObject: IGPURenderObject)
{
    const { pipeline, vertices, indices, bindingResources, drawVertex, drawIndexed } = renderObject;

    // 
    const { pipeline: nPipeline } = getNGPURenderPipeline(pipeline, renderPassFormat, vertices, indices);
    const gpuRenderPipeline = getGPURenderPipeline(device, nPipeline);

    // 计算 bindGroups
    const setBindGroups = getIGPUSetBindGroups(pipeline, bindingResources);

    const gpuBindGroups: NGPUSetBindGroup[] = setBindGroups?.map((setBindGroup, index) =>
    {
        const gpuBindGroup = getGPUBindGroup(device, setBindGroup.bindGroup);
        return { bindGroup: gpuBindGroup, dynamicOffsets: setBindGroup.dynamicOffsets } as NGPUSetBindGroup;
    });

    //
    const nRenderObject: NGPURenderObject = {
        pipeline: gpuRenderPipeline,
        setBindGroups: gpuBindGroups,
    };

    return nRenderObject;
}