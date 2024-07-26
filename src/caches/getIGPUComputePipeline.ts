import { IComputePipeline } from "../data/IComputeObject";
import { IGPUComputePipeline } from "../webgpu-data-driven/data/IGPUComputeObject";
import { getIGPUComputeStage } from "./getIGPUComputeStage";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";
import { WGSLBindingResourceInfoMap } from "./getWGSLReflectInfo";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *获取完整的计算管线描述。
 *
 * @param computePipeline 计算管线描述。
 * @returns 完整的计算管线描述。
 */
export function getIGPUComputePipeline(computePipeline: IComputePipeline)
{
    let result = computePipelineMap.get(computePipeline);
    if (result)
    {
        return result;
    }

    const gpuComputeStage = getIGPUComputeStage(computePipeline.compute);

    // 从GPU管线中获取管线布局。
    const { gpuPipelineLayout, bindingResourceInfoMap } = getIGPUPipelineLayout(computePipeline);

    const gpuComputePipeline: IGPUComputePipeline = {
        ...computePipeline,
        layout: gpuPipelineLayout,
        compute: gpuComputeStage,
    };

    result = { gpuComputePipeline, bindingResourceInfoMap };

    computePipelineMap.set(computePipeline, result);

    return result;
}

const computePipelineMap = new Map<IComputePipeline, { gpuComputePipeline: IGPUComputePipeline, bindingResourceInfoMap: WGSLBindingResourceInfoMap }>();
