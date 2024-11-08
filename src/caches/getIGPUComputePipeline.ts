import { IGPUComputePipeline, IGPUProgrammableStage } from "../data/IGPUComputeObject";
import { getIGPUPipelineLayout } from "./getIGPUPipelineLayout";
import { getWGSLReflectInfo, WGSLBindingResourceInfoMap } from "./getWGSLReflectInfo";

/**
 * 从渲染管线描述、渲染通道描述以及完整的顶点属性数据映射获得完整的渲染管线描述以及顶点缓冲区数组。
 *获取完整的计算管线描述。
 *
 * @param computePipeline 计算管线描述。
 * @returns 完整的计算管线描述。
 */
export function getIGPUComputePipeline(computePipeline: IGPUComputePipeline)
{
    let result = computePipelineMap.get(computePipeline);
    if (result) return result;

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

const computePipelineMap = new Map<IGPUComputePipeline, { gpuComputePipeline: IGPUComputePipeline, bindingResourceInfoMap: WGSLBindingResourceInfoMap }>();

/**
* 获取计算阶段完整描述。
*
* @param computeStage 计算阶段描述。
* @returns 计算阶段完整描述。
*/
function getIGPUComputeStage(computeStage: IGPUProgrammableStage)
{
    if (!computeStage.entryPoint)
    {
        const reflect = getWGSLReflectInfo(computeStage.code);
        console.assert(reflect.computeEntryList.length > 0, `WGSL着色器 ${computeStage.code} 中不存在计算入口点。`);
        computeStage.entryPoint = reflect.computeEntryList[0].entryPoint;
    }
    else
    {
        // 验证着色器中包含指定片段入口函数。
        const reflect = getWGSLReflectInfo(computeStage.code);
        console.assert(!!reflect.computeEntryMap[computeStage.entryPoint], `WGSL着色器 ${computeStage.code} 中不存在指定的计算入口点 ${computeStage.entryPoint}`);
    }

    return computeStage;
}
